/**
 * WebSocket Service
 * 
 * Manages WebSocket connections, message routing, and presence tracking.
 * Implements Class A, B, and C realtime interactions per INV-010.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {
  ConnectionMetadata,
  ConnectionState,
  WebSocketMessage,
  PresenceInfo,
  RoomMembership,
  InteractionClass,
  AuthenticationError,
  AuthorizationError,
  TenantIsolationViolation,
  RateLimitExceeded,
  WebSocketConfig
} from '../models/types';
import { Logger } from '../utils/logger';

/**
 * WebSocket Service
 * 
 * Provides scalable WebSocket connectivity with tenant isolation,
 * authentication, and message routing.
 */
export class WebSocketService {
  private io: SocketIOServer;
  private redis: Redis;
  private redisSub: Redis;
  private connections: Map<string, ConnectionMetadata>;
  private logger: Logger;
  private config: WebSocketConfig;
  private serverInstanceId: string;
  
  constructor(
    httpServer: HTTPServer,
    config: WebSocketConfig,
    redisUrl: string,
    logger: Logger
  ) {
    this.config = config;
    this.logger = logger;
    this.serverInstanceId = uuidv4();
    this.connections = new Map();
    
    // Initialize Redis clients
    this.redis = new Redis(redisUrl);
    this.redisSub = new Redis(redisUrl);
    
    // Initialize Socket.IO server
    this.io = new SocketIOServer(httpServer, {
      path: config.path,
      cors: config.cors,
      pingInterval: config.pingInterval,
      pingTimeout: config.pingTimeout,
      maxHttpBufferSize: 1e6, // 1MB
      transports: ['websocket', 'polling']
    });
    
    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupRedisSubscriptions();
    
    this.logger.info('WebSocket service initialized', {
      serverInstanceId: this.serverInstanceId,
      config: this.config
    });
  }
  
  /**
   * Setup authentication and authorization middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      try {
        // Extract JWT token from handshake
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          throw new AuthenticationError('No authentication token provided');
        }
        
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // Extract tenant and user context
        socket.data.tenantId = decoded.tenantId;
        socket.data.userId = decoded.userId;
        socket.data.roles = decoded.roles || [];
        socket.data.clientId = socket.handshake.query.clientId || uuidv4();
        
        // Check connection limit
        const connectionCount = await this.getConnectionCount();
        if (connectionCount >= this.config.maxConnections) {
          throw new Error('Maximum connection limit reached');
        }
        
        this.logger.info('WebSocket authentication successful', {
          tenantId: socket.data.tenantId,
          userId: socket.data.userId,
          clientId: socket.data.clientId
        });
        
        next();
      } catch (error) {
        this.logger.error('WebSocket authentication failed', { error });
        next(new AuthenticationError('Authentication failed'));
      }
    });
  }
  
  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', async (socket: Socket) => {
      try {
        await this.handleConnection(socket);
        
        // Message handlers
        socket.on('message', (data) => this.handleMessage(socket, data));
        socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
        socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));
        socket.on('presence_update', (data) => this.handlePresenceUpdate(socket, data));
        
        // Heartbeat handler
        socket.on('ping', () => this.handlePing(socket));
        
        // Disconnection handler
        socket.on('disconnect', (reason) => this.handleDisconnection(socket, reason));
        
      } catch (error) {
        this.logger.error('Error handling connection', { error });
        socket.disconnect(true);
      }
    });
  }
  
  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(socket: Socket): Promise<void> {
    const connectionId = socket.id;
    const { tenantId, userId, clientId } = socket.data;
    
    // Create connection metadata
    const metadata: ConnectionMetadata = {
      connectionId,
      tenantId,
      userId,
      clientId,
      serverInstanceId: this.serverInstanceId,
      connectedAt: new Date(),
      lastSeenAt: new Date(),
      clientIp: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] || 'unknown',
      state: ConnectionState.CONNECTED
    };
    
    // Store connection metadata
    this.connections.set(connectionId, metadata);
    await this.storeConnectionInRedis(metadata);
    
    // Update presence
    await this.updatePresence(tenantId, userId, 'online');
    
    // Send welcome message
    socket.emit('connected', {
      connectionId,
      serverTime: new Date().toISOString(),
      interactionClasses: Object.values(InteractionClass)
    });
    
    this.logger.info('WebSocket connection established', { metadata });
  }
  
  /**
   * Handle incoming message
   */
  private async handleMessage(socket: Socket, data: any): Promise<void> {
    try {
      // Rate limiting
      await this.checkRateLimit(socket);
      
      // Validate message
      const message = this.validateMessage(socket, data);
      
      // Route message based on type
      if (message.recipientId) {
        await this.sendDirectMessage(message);
      } else if (message.roomId) {
        await this.broadcastToRoom(message);
      } else {
        throw new Error('Message must specify recipientId or roomId');
      }
      
      // Acknowledge message
      socket.emit('message_ack', { messageId: message.messageId });
      
    } catch (error) {
      this.logger.error('Error handling message', { error });
      socket.emit('error', { error: error.message });
    }
  }
  
  /**
   * Handle join room request
   */
  private async handleJoinRoom(socket: Socket, data: any): Promise<void> {
    try {
      const { roomId } = data;
      const { tenantId, userId } = socket.data;
      
      // Validate room access (implement authorization logic)
      await this.validateRoomAccess(tenantId, userId, roomId);
      
      // Join room
      socket.join(`${tenantId}:${roomId}`);
      
      // Store room membership in Redis
      const membership: RoomMembership = {
        roomId,
        tenantId,
        userId,
        joinedAt: new Date()
      };
      await this.storeRoomMembership(membership);
      
      socket.emit('room_joined', { roomId });
      
      this.logger.info('User joined room', { tenantId, userId, roomId });
      
    } catch (error) {
      this.logger.error('Error joining room', { error });
      socket.emit('error', { error: error.message });
    }
  }
  
  /**
   * Handle leave room request
   */
  private async handleLeaveRoom(socket: Socket, data: any): Promise<void> {
    try {
      const { roomId } = data;
      const { tenantId, userId } = socket.data;
      
      // Leave room
      socket.leave(`${tenantId}:${roomId}`);
      
      // Remove room membership from Redis
      await this.removeRoomMembership(tenantId, userId, roomId);
      
      socket.emit('room_left', { roomId });
      
      this.logger.info('User left room', { tenantId, userId, roomId });
      
    } catch (error) {
      this.logger.error('Error leaving room', { error });
      socket.emit('error', { error: error.message });
    }
  }
  
  /**
   * Handle presence update (Class A interaction)
   */
  private async handlePresenceUpdate(socket: Socket, data: any): Promise<void> {
    try {
      const { status, metadata } = data;
      const { tenantId, userId } = socket.data;
      
      // Update presence in Redis
      await this.updatePresence(tenantId, userId, status, metadata);
      
      // Broadcast presence update to relevant users
      // (implement based on application logic - friends, team members, etc.)
      
      this.logger.debug('Presence updated', { tenantId, userId, status });
      
    } catch (error) {
      this.logger.error('Error updating presence', { error });
    }
  }
  
  /**
   * Handle ping (heartbeat)
   */
  private async handlePing(socket: Socket): Promise<void> {
    const connectionId = socket.id;
    const metadata = this.connections.get(connectionId);
    
    if (metadata) {
      metadata.lastSeenAt = new Date();
      await this.updateConnectionInRedis(metadata);
    }
    
    socket.emit('pong');
  }
  
  /**
   * Handle disconnection
   */
  private async handleDisconnection(socket: Socket, reason: string): Promise<void> {
    const connectionId = socket.id;
    const { tenantId, userId } = socket.data;
    
    // Remove connection metadata
    this.connections.delete(connectionId);
    await this.removeConnectionFromRedis(connectionId);
    
    // Update presence to offline if no other connections
    const hasOtherConnections = await this.hasOtherConnections(tenantId, userId);
    if (!hasOtherConnections) {
      await this.updatePresence(tenantId, userId, 'offline');
    }
    
    this.logger.info('WebSocket connection closed', {
      connectionId,
      tenantId,
      userId,
      reason
    });
  }
  
  /**
   * Send direct message to specific user
   */
  private async sendDirectMessage(message: WebSocketMessage): Promise<void> {
    // Validate tenant isolation
    if (message.tenantId !== message.recipientId) {
      // Ensure sender and recipient are in same tenant
      const recipientTenant = await this.getUserTenant(message.recipientId!);
      if (recipientTenant !== message.tenantId) {
        throw new TenantIsolationViolation('Cross-tenant messaging not allowed');
      }
    }
    
    // Publish to Redis for delivery by appropriate server instance
    const channel = `user:${message.tenantId}:${message.recipientId}`;
    await this.redis.publish(channel, JSON.stringify(message));
  }
  
  /**
   * Broadcast message to room
   */
  private async broadcastToRoom(message: WebSocketMessage): Promise<void> {
    // Publish to Redis for delivery to all room members
    const channel = `room:${message.tenantId}:${message.roomId}`;
    await this.redis.publish(channel, JSON.stringify(message));
  }
  
  /**
   * Setup Redis pub/sub subscriptions
   */
  private setupRedisSubscriptions(): void {
    // Subscribe to user-specific channels for this server's connections
    this.redisSub.psubscribe('user:*', (err, count) => {
      if (err) {
        this.logger.error('Redis subscription error', { error: err });
      } else {
        this.logger.info('Subscribed to user channels', { count });
      }
    });
    
    // Subscribe to room channels
    this.redisSub.psubscribe('room:*', (err, count) => {
      if (err) {
        this.logger.error('Redis subscription error', { error: err });
      } else {
        this.logger.info('Subscribed to room channels', { count });
      }
    });
    
    // Handle incoming messages
    this.redisSub.on('pmessage', async (pattern, channel, messageStr) => {
      try {
        const message: WebSocketMessage = JSON.parse(messageStr);
        
        if (channel.startsWith('user:')) {
          await this.deliverDirectMessage(message);
        } else if (channel.startsWith('room:')) {
          await this.deliverRoomMessage(message);
        }
      } catch (error) {
        this.logger.error('Error processing Redis message', { error, channel });
      }
    });
  }
  
  /**
   * Deliver direct message to connected user
   */
  private async deliverDirectMessage(message: WebSocketMessage): Promise<void> {
    // Find connections for recipient
    const connections = Array.from(this.connections.values()).filter(
      conn => conn.userId === message.recipientId && conn.tenantId === message.tenantId
    );
    
    // Deliver to all user's connections
    for (const conn of connections) {
      const socket = this.io.sockets.sockets.get(conn.connectionId);
      if (socket) {
        socket.emit('message', message);
      }
    }
    
    // If no connections, queue for later delivery (Class B fallback)
    if (connections.length === 0) {
      await this.queueMessageForLater(message);
    }
  }
  
  /**
   * Deliver message to room members
   */
  private async deliverRoomMessage(message: WebSocketMessage): Promise<void> {
    const roomKey = `${message.tenantId}:${message.roomId}`;
    this.io.to(roomKey).emit('message', message);
  }
  
  /**
   * Queue message for later delivery (Class B fallback)
   */
  private async queueMessageForLater(message: WebSocketMessage): Promise<void> {
    const queueKey = `message_queue:${message.tenantId}:${message.recipientId}`;
    await this.redis.lpush(queueKey, JSON.stringify(message));
    await this.redis.expire(queueKey, 86400); // 24 hour TTL
    
    this.logger.info('Message queued for offline user', {
      tenantId: message.tenantId,
      recipientId: message.recipientId,
      messageId: message.messageId
    });
  }
  
  /**
   * Validate message structure and permissions
   */
  private validateMessage(socket: Socket, data: any): WebSocketMessage {
    const { tenantId, userId } = socket.data;
    
    // Validate required fields
    if (!data.type || !data.payload) {
      throw new Error('Message must include type and payload');
    }
    
    // Validate tenant isolation
    if (data.tenantId && data.tenantId !== tenantId) {
      throw new TenantIsolationViolation('Cannot send message for different tenant');
    }
    
    // Create message object
    const message: WebSocketMessage = {
      messageId: uuidv4(),
      type: data.type,
      interactionClass: data.interactionClass || InteractionClass.CLASS_C,
      tenantId,
      senderId: userId,
      recipientId: data.recipientId,
      roomId: data.roomId,
      payload: data.payload,
      timestamp: new Date(),
      metadata: data.metadata
    };
    
    return message;
  }
  
  /**
   * Check rate limit for connection
   */
  private async checkRateLimit(socket: Socket): Promise<void> {
    const connectionId = socket.id;
    const key = `rate_limit:${connectionId}`;
    const count = await this.redis.incr(key);
    
    if (count === 1) {
      await this.redis.expire(key, 60); // 1 minute window
    }
    
    if (count > this.config.messageRateLimit) {
      throw new RateLimitExceeded('Message rate limit exceeded');
    }
  }
  
  /**
   * Store connection metadata in Redis
   */
  private async storeConnectionInRedis(metadata: ConnectionMetadata): Promise<void> {
    const key = `connection:${metadata.connectionId}`;
    await this.redis.setex(key, 3600, JSON.stringify(metadata));
    
    // Add to user's connection set
    const userKey = `user_connections:${metadata.tenantId}:${metadata.userId}`;
    await this.redis.sadd(userKey, metadata.connectionId);
    await this.redis.expire(userKey, 3600);
  }
  
  /**
   * Update connection metadata in Redis
   */
  private async updateConnectionInRedis(metadata: ConnectionMetadata): Promise<void> {
    const key = `connection:${metadata.connectionId}`;
    await this.redis.setex(key, 3600, JSON.stringify(metadata));
  }
  
  /**
   * Remove connection from Redis
   */
  private async removeConnectionFromRedis(connectionId: string): Promise<void> {
    const key = `connection:${connectionId}`;
    const metadataStr = await this.redis.get(key);
    
    if (metadataStr) {
      const metadata: ConnectionMetadata = JSON.parse(metadataStr);
      const userKey = `user_connections:${metadata.tenantId}:${metadata.userId}`;
      await this.redis.srem(userKey, connectionId);
    }
    
    await this.redis.del(key);
  }
  
  /**
   * Update user presence
   */
  private async updatePresence(
    tenantId: string,
    userId: string,
    status: 'online' | 'away' | 'offline',
    metadata?: any
  ): Promise<void> {
    const presence: PresenceInfo = {
      userId,
      tenantId,
      status,
      lastActive: new Date(),
      metadata
    };
    
    const key = `presence:${tenantId}:${userId}`;
    await this.redis.setex(key, 300, JSON.stringify(presence)); // 5 minute TTL
  }
  
  /**
   * Store room membership
   */
  private async storeRoomMembership(membership: RoomMembership): Promise<void> {
    const key = `room_members:${membership.tenantId}:${membership.roomId}`;
    await this.redis.sadd(key, membership.userId);
  }
  
  /**
   * Remove room membership
   */
  private async removeRoomMembership(
    tenantId: string,
    userId: string,
    roomId: string
  ): Promise<void> {
    const key = `room_members:${tenantId}:${roomId}`;
    await this.redis.srem(key, userId);
  }
  
  /**
   * Check if user has other active connections
   */
  private async hasOtherConnections(tenantId: string, userId: string): Promise<boolean> {
    const key = `user_connections:${tenantId}:${userId}`;
    const count = await this.redis.scard(key);
    return count > 0;
  }
  
  /**
   * Get user's tenant ID
   */
  private async getUserTenant(userId: string): Promise<string> {
    // Implement lookup from database or cache
    // For now, return placeholder
    return 'tenant-id';
  }
  
  /**
   * Validate room access
   */
  private async validateRoomAccess(
    tenantId: string,
    userId: string,
    roomId: string
  ): Promise<void> {
    // Implement authorization logic
    // Check if user has permission to access room
    // Throw AuthorizationError if not authorized
  }
  
  /**
   * Get total connection count
   */
  private async getConnectionCount(): Promise<number> {
    return this.connections.size;
  }
  
  /**
   * Shutdown service gracefully
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down WebSocket service');
    
    // Close all connections
    this.io.close();
    
    // Close Redis connections
    await this.redis.quit();
    await this.redisSub.quit();
    
    this.logger.info('WebSocket service shutdown complete');
  }
}

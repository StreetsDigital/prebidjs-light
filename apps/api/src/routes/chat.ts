import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

// Mock chat store - In production, this would be a database
const chatSessions = new Map<string, {
  session_id: string;
  user_id: string;
  title: string;
  created_at: string;
  last_message_at: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    actions?: Array<{
      tool: string;
      status: 'success' | 'error';
      details?: string;
    }>;
  }>;
}>();

export default async function chatRoutes(fastify: FastifyInstance) {
  // Send a message and get AI response
  fastify.post('/chat/messages', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { session_id, message, context } = request.body as {
        session_id?: string;
        message: string;
        context?: Record<string, any>;
      };

      const userId = (request.user as any).id;

      // Get or create session
      let sessionId = session_id;
      if (!sessionId) {
        sessionId = uuidv4();
        chatSessions.set(sessionId, {
          session_id: sessionId,
          user_id: userId,
          title: message.substring(0, 50), // Use first message as title
          created_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
          messages: [],
        });
      }

      const session = chatSessions.get(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      // Verify session belongs to user
      if (session.user_id !== userId) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Add user message
      const userMessage = {
        id: uuidv4(),
        role: 'user' as const,
        content: message,
        timestamp: new Date().toISOString(),
      };
      session.messages.push(userMessage);

      // Generate AI response (mock - replace with actual AI integration)
      const aiResponse = await generateAIResponse(message, session.messages, context);

      // Add assistant message
      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant' as const,
        content: aiResponse.content,
        timestamp: new Date().toISOString(),
        actions: aiResponse.actions,
      };
      session.messages.push(assistantMessage);

      // Update session timestamp
      session.last_message_at = new Date().toISOString();

      return {
        success: true,
        session_id: sessionId,
        response: aiResponse.content,
        actions: aiResponse.actions,
        message_id: assistantMessage.id,
      };
    },
  });

  // Get list of chat sessions
  fastify.get('/chat/sessions', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { limit = 20 } = request.query as { limit?: number };
      const userId = (request.user as any).id;

      // Get user's sessions
      const sessions = Array.from(chatSessions.values())
        .filter((session) => session.user_id === userId)
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
        .slice(0, Number(limit))
        .map((session) => ({
          session_id: session.session_id,
          title: session.title,
          created_at: session.created_at,
          last_message_at: session.last_message_at,
          message_count: session.messages.length,
        }));

      return {
        success: true,
        sessions,
      };
    },
  });

  // Get specific session with messages
  fastify.get('/chat/sessions/:sessionId', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const userId = (request.user as any).id;

      const session = chatSessions.get(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      // Verify session belongs to user
      if (session.user_id !== userId) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      return {
        success: true,
        session: {
          session_id: session.session_id,
          title: session.title,
          created_at: session.created_at,
          last_message_at: session.last_message_at,
          messages: session.messages,
        },
      };
    },
  });

  // Delete a session
  fastify.delete('/chat/sessions/:sessionId', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const userId = (request.user as any).id;

      const session = chatSessions.get(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      // Verify session belongs to user
      if (session.user_id !== userId) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      chatSessions.delete(sessionId);

      return {
        success: true,
        message: 'Session deleted successfully',
      };
    },
  });
}

// AI response generator - Using Claude Haiku for cost-effective responses
// To enable real AI, install @anthropic-ai/sdk and set ANTHROPIC_API_KEY
async function generateAIResponse(
  message: string,
  history: Array<any>,
  context?: Record<string, any>
): Promise<{
  content: string;
  actions?: Array<{ tool: string; status: 'success' | 'error'; details?: string }>;
}> {
  // TODO: Uncomment this block to enable Claude Haiku
  /*
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Haiku - fast and cost-effective
      max_tokens: 1024,
      system: `You are an AdOps Assistant for a Prebid.js platform. Help users manage publishers, ad units, bidders, and revenue optimization. Keep responses concise and actionable.`,
      messages: [
        // Include conversation history for context
        ...history.slice(-5).map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ],
    });

    return {
      content: response.content[0].text,
      actions: [] // Parse actions from response if needed
    };
  } catch (error) {
    console.error('Claude API error:', error);
    // Fall back to mock response on error
  }
  */

  // MOCK RESPONSES - Remove this section when Claude Haiku is enabled
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('publisher')) {
    return {
      content: 'I can help you manage your publishers. You currently have 3 active publishers:\n\n• Publisher A (ID: pub-001)\n• Publisher B (ID: pub-002)\n• Publisher C (ID: pub-003)\n\nWould you like to see detailed information about any of these publishers?',
      actions: [{ tool: 'list_publishers', status: 'success' }],
    };
  }

  if (lowerMessage.includes('revenue') || lowerMessage.includes('earning')) {
    return {
      content: 'Based on your current data:\n\n📊 **This Week\'s Revenue:**\n• Total: $12,450.50\n• Average CPM: $2.35\n• Fill Rate: 85.3%\n• Impressions: 5.3M\n\nRevenue is up 12% compared to last week. Would you like to see a detailed breakdown by publisher or ad unit?',
      actions: [{ tool: 'fetch_revenue_data', status: 'success' }],
    };
  }

  if (lowerMessage.includes('ab test') || lowerMessage.includes('test')) {
    return {
      content: 'I can help you create an AB test! Here\'s what you\'ll need:\n\n1. **Test Name**: What would you like to call this test?\n2. **Publisher/Website**: Which publisher or website?\n3. **Traffic Split**: How should traffic be divided? (e.g., 50/50)\n4. **Variants**: What strategies do you want to test?\n\nShall we start by choosing which publisher to test on?',
      actions: [],
    };
  }

  if (lowerMessage.includes('bidder') || lowerMessage.includes('enable') || lowerMessage.includes('disable')) {
    return {
      content: 'To enable a new bidder:\n\n1. Go to the publisher\'s settings\n2. Navigate to "Bidders" section\n3. Click "Add Bidder"\n4. Select the bidder from the list\n5. Configure bidder-specific settings (timeout, parameters)\n6. Save and test\n\nWhich bidder would you like to enable? Some popular options include:\n• AppNexus\n• PubMatic\n• Rubicon\n• Index Exchange\n• OpenX',
      actions: [],
    };
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    return {
      content: 'I\'m your AdOps Assistant! I can help you with:\n\n🏢 **Publishers & Websites**\n• List and manage publishers\n• View publisher performance\n• Configure website settings\n\n💰 **Revenue & Analytics**\n• View revenue reports\n• Track performance metrics\n• Compare time periods\n\n🧪 **AB Testing**\n• Create and manage AB tests\n• View test results\n• Optimize strategies\n\n⚙️ **Bidder Management**\n• Enable/disable bidders\n• Configure bidder settings\n• Monitor bidder health\n\nWhat would you like to do?',
      actions: [],
    };
  }

  // Default response
  return {
    content: `I understand you're asking about: "${message}"\n\nI'm currently a prototype AI assistant. In production, I would be integrated with a real AI system (like Claude API or OpenAI) to provide intelligent responses.\n\nFor now, try asking about:\n• "List my publishers"\n• "Show revenue this week"\n• "Help me create an AB test"\n• "How do I enable a bidder?"`,
    actions: [],
  };
}

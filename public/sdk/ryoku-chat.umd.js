/**
 * Ryoku Chat SDK v2.0 - UMD Bundle
 * Use: <script src="https://ryoku.app/sdk/ryoku-chat.umd.js"></script>
 * 
 * @example
 * const ryoku = new RyokuChat({ baseUrl: "https://your-domain.com" });
 * ryoku.checkAgentStatus("your-slug").then(status => console.log(status.online));
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    root.RyokuChat = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RyokuChat = function RyokuChat(config) {
    if (!(this instanceof RyokuChat)) return new RyokuChat(config);
    
    config = config || {};
    this.config = config;
    this.baseUrl = config.baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    this.currentSession = null;
    this.pusher = null;
    this.unsubscribeCallbacks = [];

    this._initPusher();
  };

  RyokuChat.prototype._initPusher = function() {
    if (typeof window === 'undefined' || !this.config.pusherKey) return;
    
    try {
      if (window.Pusher) {
        this.pusher = new window.Pusher(this.config.pusherKey, {
          cluster: this.config.pusherCluster || 'us2',
          authEndpoint: this.baseUrl + '/api/pusher/auth'
        });
      }
    } catch (e) {
      console.warn('[RyokuChat] Pusher not available:', e);
    }
  };

  RyokuChat.prototype.checkAgentStatus = async function(slug) {
    var resp = await fetch(this.baseUrl + '/api/agent/status?slug=' + encodeURIComponent(slug));
    if (!resp.ok) throw new Error('Status check failed: ' + resp.statusText);
    return resp.json();
  };

  RyokuChat.prototype.getSession = function(slug) {
    if (this.currentSession && this.currentSession.slug === slug) return this.currentSession;
    
    var storageKey = 'ryoku_session_' + slug;
    var id = null;
    
    if (typeof localStorage !== 'undefined' && this.config.persistSession !== false) {
      id = localStorage.getItem(storageKey);
    }
    
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : 'sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
      if (typeof localStorage !== 'undefined' && this.config.persistSession !== false) {
        localStorage.setItem(storageKey, id);
      }
    }
    
    this.currentSession = { id: id, slug: slug };
    return this.currentSession;
  };

  RyokuChat.prototype.resetSession = function(slug) {
    var storageKey = 'ryoku_session_' + slug;
    var id = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : 'sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
    if (typeof localStorage !== 'undefined' && this.config.persistSession !== false) {
      localStorage.setItem(storageKey, id);
    }
    
    this.currentSession = { id: id, slug: slug };
    return this.currentSession;
  };

  RyokuChat.prototype.chat = async function(options) {
    var self = this;
    var slug = options.slug;
    var messages = options.messages || [];
    var onMessage = options.onMessage || function() {};
    var onError = options.onError || function(e) { console.error(e); };
    var onFinish = options.onFinish || function() {};
    
    var session = this.getSession(slug);

    var resp = await fetch(this.baseUrl + '/api/chat/' + slug, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages, conversationId: session.id })
    });

    if (!resp.ok) {
      var errData = {};
      try { errData = await resp.json(); } catch {}
      throw new Error(errData.error || 'Chat failed: ' + resp.statusText);
    }

    if (!resp.body) throw new Error('No response body');

    var reader = resp.body.getReader();
    var decoder = new TextDecoder();
    var fullText = '';

    return new ReadableStream({
      start: function(controller) {
        function pump() {
          reader.read().then(function(out) {
            if (out.done) {
              onFinish(fullText);
              controller.close();
              return;
            }
            
            var chunk = decoder.decode(out.value);
            var lines = chunk.split('\n');
            
            for (var i = 0; i < lines.length; i++) {
              var line = lines[i].trim();
              if (!line) continue;

              // Vercel AI SDK data stream format: 0:"json-encoded-text"
              var colonIdx = line.indexOf(':');
              if (colonIdx !== -1 && /^\d+$/.test(line.slice(0, colonIdx))) {
                try {
                  var parsed = JSON.parse(line.slice(colonIdx + 1));
                  if (typeof parsed === 'string') {
                    fullText += parsed;
                    onMessage(parsed);
                    controller.enqueue(parsed);
                    continue;
                  }
                } catch(e) {}
              }

              // JSON: data: {"type":"text-delta","delta":"..."}
              if (line.indexOf('data: ') === 0) {
                var data = line.slice(6).trim();
                if (data === '[DONE]' || !data) continue;
                try {
                  var p = JSON.parse(data);
                  if (p.type === 'text-delta' && p.delta) {
                    fullText += p.delta;
                    onMessage(p.delta);
                    controller.enqueue(p.delta);
                  }
                } catch {}
              }
            }
            pump();
          }).catch(function(e) {
            onError(e);
            controller.error(e);
          });
        }
        pump();
      }
    });
  };

  RyokuChat.prototype.escalate = async function(options) {
    var resp = await fetch(this.baseUrl + '/api/chat/escalate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: options.slug,
        conversationId: options.conversationId,
        reason: options.reason,
        email: options.email,
        phone: options.phone
      })
    });
    
    if (!resp.ok) {
      var err = {};
      try { err = await resp.json(); } catch {}
      throw new Error(err.error || 'Escalation failed');
    }
    return resp.json();
  };

  RyokuChat.prototype.sendOfflineQuery = async function(options) {
    var resp = await fetch(this.baseUrl + '/api/chat/offline-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: options.slug,
        name: options.name,
        email: options.email,
        query: options.query
      })
    });
    
    if (!resp.ok) {
      var err = {};
      try { err = await resp.json(); } catch {}
      throw new Error(err.error || 'Offline query failed');
    }
    return resp.json();
  };

  RyokuChat.prototype.subscribe = function(convoId, event, callback) {
    var self = this;
    if (!this.pusher) {
      console.warn('[RyokuChat] Pusher not initialized');
      return function() {};
    }
    
    var ch = this.pusher.subscribe('private-conversation-' + convoId);
    ch.bind(event, callback);

    var unsub = function() {
      ch.unbind(event, callback);
      self.pusher && self.pusher.unsubscribe('private-conversation-' + convoId);
    };
    
    this.unsubscribeCallbacks.push(unsub);
    return unsub;
  };

  RyokuChat.prototype.subscribeToAgentStatus = function(businessId, callback) {
    var self = this;
    if (!this.pusher) {
      console.warn('[RyokuChat] Pusher not initialized');
      return function() {};
    }
    
    var ch = this.pusher.subscribe('private-business-' + businessId);
    ch.bind('agent:status', callback);
    
    var unsub = function() {
      ch.unbind('agent:status', callback);
      self.pusher && self.pusher.unsubscribe('private-business-' + businessId);
    };
    
    this.unsubscribeCallbacks.push(unsub);
    return unsub;
  };

  RyokuChat.prototype.destroy = function() {
    this.unsubscribeCallbacks.forEach(function(f) { f(); });
    this.unsubscribeCallbacks = [];
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
    }
  };

  return RyokuChat;
}));
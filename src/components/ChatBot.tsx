import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Sparkles, Mic, MicOff, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getAiResponse, transcribeAudio } from '../services/geminiService';
import { UserRole, Order } from '../types';
interface Message {
  role: 'user' | 'assistant';
  content: string;
}
export default function ChatBot({ 
  currentRole, 
  crops = [], 
  orders = [], 
  setOrders, 
  handleAddOrder,
  handleUpdateOrder,
  addNotification 
}: { 
  currentRole: UserRole, 
  crops?: any[], 
  orders?: Order[], 
  setOrders?: any, 
  handleAddOrder?: (data: any) => Promise<void>,
  handleUpdateOrder?: (id: string, data: any) => Promise<void>,
  addNotification?: (msg: string, sev?: 'low'|'high'|'critical', type?: string) => void 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Hello! I'm your Organic Agroflow AI assistant. As an intelligence node for **${currentRole}** operations, how can I help you optimize your sustainable harvest today?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleTranscription(audioBlob);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error('Recording error:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };
  const handleTranscription = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      // Convert Blob to base64 for Gemini API
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await base64Promise;
      const mimeType = audioBlob.type || 'audio/webm';
      
      const transcription = await transcribeAudio(base64Audio, mimeType);
      if (transcription) {
        setInput(prev => prev + (prev ? ' ' : '') + transcription);
      }
    } catch (err) {
      console.error('Transcription failed:', err);
    } finally {
      setIsTranscribing(false);
    }
  };
  const toggleListening = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    try {
      let responseText = await getAiResponse(userMessage, { 
        role: currentRole, 
        timestamp: new Date().toISOString(),
        crops,
        orders
      });
      
      if (typeof responseText !== 'string') {
        responseText = String(responseText || "I couldn't process this request.");
      }
      // Parse simulated tool calls
      const actionMatch = responseText.match(/\{\s*"action"\s*:\s*"[^"]+"[^}]*\}/);
      if (actionMatch) {
         try {
          const actionObj = JSON.parse(actionMatch[0]);
          responseText = responseText.replace(actionMatch[0], '').trim();
          
          if (actionObj.action === 'REQUEST_ORDER' && currentRole === UserRole.WHOLESALER && handleAddOrder) {
             const cropName = actionObj.cropName || 'a crop';
             const possibleCrop = crops.find(c => c.name.toLowerCase().includes(cropName.toLowerCase())) || crops[0];
             
             if (possibleCrop) {
               const newOrder = {
                  cropId: possibleCrop.id,
                  farmerId: possibleCrop.farmerId || 'unknown',
                  wholesalerId: 'w1',
                  sellerRole: 'farmer' as const,
                  buyerRole: 'wholesaler' as const,
                  quantity: possibleCrop.quantity || 10,
                  status: 'requested' as const,
                  valueINR: (possibleCrop.quantity || 10) * (possibleCrop.pricePerUnit || 100)
                };
                handleAddOrder(newOrder);
                if (addNotification) {
                  addNotification(`Wholesaler quickly requested ${newOrder.quantity} of ${possibleCrop.name} via AI`, 'high', 'demand');
                }
             }
          } 
          else if (actionObj.action === 'ACCEPT_ORDER' && currentRole === UserRole.FARMER && handleUpdateOrder) {
             const requestedOrders = orders.filter(o => o.status === 'requested');
             if (requestedOrders.length > 0) {
               const orderToAccept = requestedOrders[0];
               handleUpdateOrder(orderToAccept.id, { status: 'accepted' });
               if (addNotification) {
                  addNotification(`Farmer accepted the order via AI`, 'high', 'demand');
               }
             }
          }
        } catch (e) {
          console.error("Failed to parse action json", e);
        }
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: responseText || "I'm sorry, I couldn't process your request as expected." }]);
    } catch (e) {
      console.error("Chat error:", e);
      setMessages(prev => [...prev, { role: 'assistant', content: `An unexpected error occurred: ${e instanceof Error ? e.message : String(e)}` }]);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-80 max-h-[500px] bg-bg-dark border border-border-main rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-3 bg-gradient-to-r from-emerald-main to-emerald-deep flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white fill-white" />
                </div>
                <p className="font-extrabold text-xs tracking-tighter uppercase">AgroFlow <span className="opacity-70">Agent</span></p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/10 p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[350px] scrollbar-hide text-xs bg-black/20"
            >
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[90%] p-3 rounded-2xl shadow-lg ${
                    msg.role === 'user' 
                      ? 'bg-emerald-main text-white rounded-tr-none' 
                      : 'bg-white/[0.03] text-slate-300 rounded-tl-none border border-white/10'
                  }`}>
                    <div className="prose prose-invert prose-xs leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/10 flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-emerald-main rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-emerald-main rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-emerald-main rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>
            {/* Input */}
            <div className="p-3 border-t border-white/5 bg-slate-900/50">
              <div className="flex gap-2">
                <button 
                  onClick={toggleListening}
                  className={`p-2 rounded-xl transition-all ${
                    isListening 
                      ? 'bg-rose-500 text-white animate-pulse' 
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                  disabled={isTranscribing}
                  title={isListening ? 'Stop Recording' : 'Speak to AI'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={isListening ? "Listening..." : (isTranscribing ? "AI is transcribing..." : "Ask intelligence...")}
                    className={`w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-emerald-main/50 transition-colors placeholder-slate-500 ${isTranscribing ? 'opacity-50' : ''}`}
                    disabled={isTranscribing}
                  />
                  {isTranscribing && (
                    <div className="absolute right-3 top-2">
                      <Loader2 className="w-4 h-4 text-emerald-main animate-spin" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleSend}
                  disabled={isLoading || isListening || isTranscribing}
                  className="bg-emerald-main text-white p-2 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-emerald-main/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-tr from-emerald-main to-emerald-deep text-white rounded-2xl shadow-[0_10px_40px_rgba(99,102,241,0.4)] flex items-center justify-center relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        {isOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6 fill-white" />}
      </motion.button>
    </div>
  );
}

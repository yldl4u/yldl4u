import React, { useState, useRef, useEffect, FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Chat } from "@google/genai";

interface Message {
  role: "user" | "model";
  parts: { text: string }[];
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatRef = useRef<Chat | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      chatRef.current = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction:
            "You are YLDL4u, a helpful and friendly AI assistant. Your responses should be informative and engaging.",
        },
      });
    } catch (error) {
      console.error("Failed to initialize Gemini AI:", error);
      // You could display an error message to the user here
    }
  }, []);

  useEffect(() => {
    // Scroll to the bottom of the chat history
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      parts: [{ text: inputValue }],
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      if (!chatRef.current) {
        throw new Error("Chat not initialized");
      }
      
      const stream = await chatRef.current.sendMessageStream({
        message: inputValue,
      });

      let modelResponse = "";
      setMessages((prev) => [
        ...prev,
        { role: "model", parts: [{ text: "" }] },
      ]);

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        modelResponse += chunkText;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].parts[0].text = modelResponse;
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        role: "model",
        parts: [{ text: "Oops! Something went wrong. Please try again." }],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header>YLDL4u</header>
      <div className="chat-history" ref={chatHistoryRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <div className="avatar">
              <span className="material-symbols-outlined">
                {msg.role === "user" ? "person" : "smart_toy"}
              </span>
            </div>
            <div className="content">{msg.parts[0].text}</div>
          </div>
        ))}
        {isLoading && messages[messages.length-1]?.role === 'user' && (
          <div className="message model">
             <div className="avatar">
              <span className="material-symbols-outlined">
                smart_toy
              </span>
            </div>
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>
      <footer>
        <form className="chat-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            aria-label="Chat input"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send message"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      </footer>
    </div>
  );
};

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);

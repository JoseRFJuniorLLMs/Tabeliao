"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ChatMessage } from "@/types";

interface ContractChatProps {
  onContractGenerated?: (content: string) => void;
}

export function ContractChat({ onContractGenerated }: ContractChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Ola! Sou a IA juridica do Tabeliao. Descreva o contrato que voce precisa e eu vou gera-lo para voce. Pode me dizer:\n\n- Que tipo de contrato precisa?\n- Quem sao as partes envolvidas?\n- Qual o valor e prazo?\n- Quais clausulas especiais deseja?",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const isFirstMessage = messages.length === 1;

      if (isFirstMessage) {
        const clarificationMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Entendi! Para gerar o melhor contrato possivel, preciso de mais algumas informacoes:\n\n1. **Dados do contratante**: Nome completo e CPF/CNPJ\n2. **Dados do contratado**: Nome completo e CPF/CNPJ\n3. **Valor total**: E forma de pagamento (a vista, parcelado, mensal)\n4. **Prazo**: Data de inicio e fim do contrato\n5. **Clausulas especiais**: Multa por atraso, reajuste, foro\n\nPode me fornecer essas informacoes?",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, clarificationMessage]);
      } else {
        const contractContent = `# CONTRATO DE PRESTACAO DE SERVICOS

## DAS PARTES

**CONTRATANTE**: Conforme informacoes fornecidas
**CONTRATADO**: Conforme informacoes fornecidas

## DO OBJETO
O presente contrato tem por objeto a prestacao de servicos conforme descrito acima.

## DO VALOR E PAGAMENTO
O valor total dos servicos sera conforme acordado entre as partes.

## DO PRAZO
O contrato tera vigencia conforme estipulado.

## DAS OBRIGACOES
### Do Contratante
- Efetuar os pagamentos nas datas acordadas
- Fornecer as informacoes necessarias para execucao

### Do Contratado
- Executar os servicos com qualidade e dentro do prazo
- Manter sigilo sobre informacoes confidenciais

## DA RESCISAO
O contrato podera ser rescindido por qualquer das partes mediante aviso previo de 30 dias.

## DO FORO
Fica eleito o foro da comarca do contratante para dirimir quaisquer controversias.`;

        const generatedMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Contrato gerado com sucesso! Confira o preview abaixo. Voce pode solicitar ajustes ou clicar em **Criar Contrato** para finalizar.",
          createdAt: new Date().toISOString(),
          contractPreview: contractContent,
        };
        setMessages((prev) => [...prev, generatedMessage]);
        if (onContractGenerated) {
          onContractGenerated(contractContent);
        }
      }

      setIsTyping(false);
    }, 2000);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/20 text-secondary"
              }`}
            >
              {message.role === "user" ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>
            <div
              className={`max-w-[80%] space-y-2 ${
                message.role === "user" ? "text-right" : ""
              }`}
            >
              <div
                className={`inline-block rounded-2xl px-4 py-2.5 text-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted rounded-tl-sm"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>

              {/* Contract Preview */}
              {message.contractPreview && (
                <Card className="mt-3 text-left">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">
                        Preview do Contrato
                      </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto rounded-lg bg-muted/50 p-4 text-xs leading-relaxed scrollbar-thin">
                      <pre className="whitespace-pre-wrap font-sans">
                        {message.contractPreview}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-secondary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="inline-block rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-card p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Descreva o contrato que precisa..."
            className="flex-1 rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isTyping}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            size="icon"
            className="shrink-0"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

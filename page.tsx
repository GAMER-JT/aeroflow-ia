"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MessageSquare,
  Send,
  Menu,
  X,
  Plus,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Copy,
  Check,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { Toaster } from "@/components/ui/toaster"

// Interfaz para el plan activo
interface ActivePlan {
  id: string
  name: string
  tokens: number
  price: number
  purchaseDate: string
  expiryDate: string
}

export default function AeroflowIA() {
  const [tokens, setTokens] = useState(100)
  const [messages, setMessages] = useState<Array<{ role: string; content: string; searchResults?: any[] }>>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [chats, setChats] = useState<Array<{ id: string; title: string; messages: any[]; timestamp: string }>>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showPurchasePanel, setShowPurchasePanel] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [selectedTokens, setSelectedTokens] = useState(0)
  const [selectedPrice, setSelectedPrice] = useState(0)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [currentDateTime, setCurrentDateTime] = useState<{
    date: string
    time: string
    fullDateTime: string
  }>({
    date: "",
    time: "",
    fullDateTime: "",
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [lastTokenWarning, setLastTokenWarning] = useState(0)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  // Estado para el plan activo
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null)
  // Estado para la última vez que se notificó sobre la renovación del plan
  const [lastPlanRenewalNotification, setLastPlanRenewalNotification] = useState(0)
  // Estado para el umbral de tokens bajos
  const [lowTokenThreshold, setLowTokenThreshold] = useState(30)
  // Agregar un estado para controlar el botón de copiado
  const [copyState, setCopyState] = useState<{
    westernUnion: boolean
    solana: boolean
  }>({
    westernUnion: false,
    solana: false,
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Initialize from localStorage

  // Agregar la función para copiar al portapapeles
  const copyToClipboard = (text: string, type: "westernUnion" | "solana") => {
    navigator.clipboard.writeText(text).then(() => {
      // Actualizar el estado para mostrar el check de confirmación
      setCopyState((prev) => ({
        ...prev,
        [type]: true,
      }))

      // Después de 2 segundos, volver al estado normal
      setTimeout(() => {
        setCopyState((prev) => ({
          ...prev,
          [type]: false,
        }))
      }, 2000)
    })
  }

  useEffect(() => {
    // Load chats
    const storedChats = localStorage.getItem("chats")
    if (storedChats) {
      const parsedChats = JSON.parse(storedChats)
      setChats(parsedChats)

      // Load most recent chat
      if (parsedChats.length > 0) {
        loadChat(parsedChats[parsedChats.length - 1].id)
      }
    }

    // Load tokens
    const storedTokenData = localStorage.getItem("tokenData")
    if (storedTokenData) {
      const { tokens: storedTokens } = JSON.parse(storedTokenData)
      setTokens(storedTokens)
    }

    // Load sidebar state
    const storedSidebarState = localStorage.getItem("sidebarCollapsed")
    if (storedSidebarState) {
      setSidebarCollapsed(JSON.parse(storedSidebarState))
    }

    // Load last token warning timestamp
    const storedLastWarning = localStorage.getItem("lastTokenWarning")
    if (storedLastWarning) {
      setLastTokenWarning(JSON.parse(storedLastWarning))
    }

    // Load active plan
    const storedActivePlan = localStorage.getItem("activePlan")
    if (storedActivePlan) {
      setActivePlan(JSON.parse(storedActivePlan))
    }

    // Load last plan renewal notification timestamp
    const storedLastPlanRenewalNotification = localStorage.getItem("lastPlanRenewalNotification")
    if (storedLastPlanRenewalNotification) {
      setLastPlanRenewalNotification(JSON.parse(storedLastPlanRenewalNotification))
    }
  }, [])

  // Update current date and time every second
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date()

      // Formato de fecha en español
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }

      // Formato de hora en español (24 horas)
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }

      // Obtener fecha y hora formateadas
      const formattedDate = now.toLocaleDateString("es-ES", dateOptions)

      // Formatear la hora correctamente
      const formattedTime = now.toLocaleTimeString("es-ES", timeOptions)

      // Capitalizar primera letra de la fecha
      const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

      setCurrentDateTime({
        date: capitalizedDate,
        time: formattedTime,
        fullDateTime: `${capitalizedDate} a las ${formattedTime}`,
      })
    }

    // Update immediately
    updateDateTime()

    // Then update every second
    const interval = setInterval(updateDateTime, 1000)

    return () => clearInterval(interval)
  }, [])

  // Check token level and show notification if needed
  useEffect(() => {
    const now = Date.now()
    // Show notification if tokens are low and last warning was more than 24 hours ago
    if (tokens <= lowTokenThreshold && now - lastTokenWarning > 24 * 60 * 60 * 1000) {
      toast({
        title: "Tokens bajos",
        description: `Te quedan ${tokens} tokens. Considera comprar más para continuar usando el servicio sin interrupciones.`,
        action: (
          <ToastAction altText="Comprar más" onClick={() => setShowPurchasePanel(true)}>
            Comprar más
          </ToastAction>
        ),
        duration: 10000,
      })

      // Update last warning timestamp
      setLastTokenWarning(now)
      localStorage.setItem("lastTokenWarning", JSON.stringify(now))

      // Si hay una conversación activa, agregar un mensaje de la IA
      if (currentChatId && messages.length > 0 && tokens <= 20) {
        const emoji = getRandomEmoji("thinking")
        const emotion = getRandomEmotion("empathetic")

        setTimeout(() => {
          const tokenWarningMessage = {
            role: "assistant",
            content: `${emoji} ${emotion}

Noto que tus tokens están bajando rápidamente. Actualmente tienes ${tokens} tokens.

Para seguir disfrutando de nuestra conversación sin interrupciones, te recomendaría adquirir más tokens o un plan mensual.

¿Te gustaría ver las opciones disponibles?`,
          }

          setMessages((prev) => [...prev, tokenWarningMessage])
          updateChat()
        }, 2000)
      }
    }
  }, [tokens, lastTokenWarning, currentChatId, messages.length])

  // Check if plan needs renewal
  useEffect(() => {
    if (!activePlan) return

    const now = new Date()
    const expiryDate = new Date(activePlan.expiryDate)
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Verificar si hoy es el día exacto de renovación (0 días para expirar)
    if (daysUntilExpiry === 0) {
      // Mostrar notificación toast
      toast({
        title: "¡Es hora de renovar tu plan!",
        description: `Tu plan "${activePlan.name}" expira hoy. Renuévalo ahora para mantener tus beneficios sin interrupciones.`,
        action: (
          <ToastAction altText="Renovar ahora" onClick={() => setShowPurchasePanel(true)}>
            Renovar ahora
          </ToastAction>
        ),
        duration: 0, // No desaparece automáticamente
      })

      // Si hay una conversación activa, hacer que la IA envíe un mensaje de renovación
      if (currentChatId && messages.length > 0) {
        const emoji = getRandomEmoji("thinking")
        const emotion = getRandomEmotion("empathetic")

        setTimeout(() => {
          const renewalMessage = {
            role: "assistant",
            content: `${emoji} ${emotion}

¡Hola! Quería recordarte que tu plan "${activePlan.name}" expira hoy (${new Date(activePlan.expiryDate).toLocaleDateString("es-ES")}).

Para seguir disfrutando de todos los beneficios sin interrupciones, te recomendaría renovar tu plan ahora mismo. 

¿Te gustaría renovar tu plan por otro mes?`,
          }

          setMessages((prev) => [...prev, renewalMessage])
          updateChat()
        }, 1000)
      }
    }
    // También mantener las notificaciones previas para 7 y 3 días antes
    else if (
      daysUntilExpiry <= 7 &&
      daysUntilExpiry > 0 &&
      now.getTime() - lastPlanRenewalNotification > 24 * 60 * 60 * 1000
    ) {
      toast({
        title: "Plan por expirar",
        description: `Tu plan "${activePlan.name}" expirará en ${daysUntilExpiry} días. Recuerda renovarlo para seguir disfrutando de los beneficios.`,
        action: (
          <ToastAction altText="Renovar ahora" onClick={() => setShowPurchasePanel(true)}>
            Renovar ahora
          </ToastAction>
        ),
        duration: 15000,
      })

      // Actualizar timestamp de última notificación
      setLastPlanRenewalNotification(now.getTime())
      localStorage.setItem("lastPlanRenewalNotification", JSON.stringify(now.getTime()))

      // Si hay una conversación activa, agregar un mensaje de la IA para días cercanos a la expiración
      if (currentChatId && messages.length > 0 && daysUntilExpiry <= 3) {
        const emoji = getRandomEmoji("thinking")
        const emotion = getRandomEmotion("empathetic")

        setTimeout(() => {
          const planRenewalMessage = {
            role: "assistant",
            content: `${emoji} ${emotion}

Quería recordarte que tu plan "${activePlan.name}" expirará en ${daysUntilExpiry} días (${new Date(activePlan.expiryDate).toLocaleDateString("es-ES")}).

Para mantener tu acceso ininterrumpido, te recomendaría renovar tu plan pronto. ¿Te gustaría hacerlo ahora?`,
          }

          setMessages((prev) => [...prev, planRenewalMessage])
          updateChat()
        }, 2000)
      }
    }
  }, [activePlan, lastPlanRenewalNotification, currentDateTime, currentChatId, messages.length])

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Update tokens in localStorage when they change
  useEffect(() => {
    const now = new Date()
    localStorage.setItem(
      "tokenData",
      JSON.stringify({
        tokens: tokens,
        lastUpdated: now.toISOString(),
      }),
    )
  }, [tokens])

  // Save active plan to localStorage when it changes
  useEffect(() => {
    if (activePlan) {
      localStorage.setItem("activePlan", JSON.stringify(activePlan))
    }
  }, [activePlan])

  // Handle typing indicator for user
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true)
    }

    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }

    // Set new timeout to stop typing indicator after 1 second of inactivity
    const timeout = setTimeout(() => {
      setIsTyping(false)
    }, 1000)

    setTypingTimeout(timeout)
  }

  // Create a new chat
  const createNewChat = () => {
    const newChatId = Date.now().toString()
    const newChat = {
      id: newChatId,
      title: "Nueva conversación",
      messages: [],
      timestamp: new Date().toISOString(),
    }

    const updatedChats = [...chats, newChat]
    setChats(updatedChats)
    setCurrentChatId(newChatId)
    setMessages([])

    // Save to localStorage
    localStorage.setItem("chats", JSON.stringify(updatedChats))

    // Close mobile menu
    setShowMobileMenu(false)

    return newChatId
  }

  // Load a chat
  const loadChat = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId)
    if (chat) {
      setCurrentChatId(chatId)
      setMessages([...chat.messages])

      // Close mobile menu
      setShowMobileMenu(false)
    }
  }

  // Delete a chat
  const deleteChat = (chatId: string, event: React.MouseEvent) => {
    event.stopPropagation()

    const updatedChats = chats.filter((chat) => chat.id !== chatId)
    setChats(updatedChats)

    // If current chat is deleted, load another one
    if (currentChatId === chatId) {
      if (updatedChats.length > 0) {
        loadChat(updatedChats[updatedChats.length - 1].id)
      } else {
        setCurrentChatId(null)
        setMessages([])
      }
    }

    // Save to localStorage
    localStorage.setItem("chats", JSON.stringify(updatedChats))
  }

  // Update current chat
  const updateChat = () => {
    if (!currentChatId) return

    const updatedChats = chats.map((chat) => {
      if (chat.id === currentChatId) {
        return {
          ...chat,
          messages: [...messages],
          timestamp: new Date().toISOString(),
        }
      }
      return chat
    })

    setChats(updatedChats)

    // Update chat title if it's a new chat
    if (currentChatId) {
      const chat = updatedChats.find((c) => c.id === currentChatId)
      if (chat && chat.title === "Nueva conversación" && messages.length > 0) {
        const firstUserMessage = messages.find((m) => m.role === "user")
        if (firstUserMessage) {
          const updatedChatsWithTitle = updatedChats.map((c) => {
            if (c.id === currentChatId) {
              return {
                ...c,
                title: firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? "..." : ""),
              }
            }
            return c
          })

          setChats(updatedChatsWithTitle)
          localStorage.setItem("chats", JSON.stringify(updatedChatsWithTitle))
        }
      }
    }

    // Save to localStorage
    localStorage.setItem("chats", JSON.stringify(updatedChats))
  }

  // Get random emoji
  const getRandomEmoji = (type: string) => {
    const emojis: Record<string, string[]> = {
      happy: ["😊", "😄", "😁", "🙂", "😉"],
      thinking: ["🤔", "🧐", "🤨", "🤓"],
      excited: ["🎉", "✨", "🚀", "💡", "⚡"],
      agree: ["👍", "✅", "👌", "💯"],
      surprise: ["😮", "😲", "😯", "🤯", "😱"],
      sad: ["😔", "😕", "🙁", "😟"],
      love: ["❤️", "💕", "💖", "💓"],
      funny: ["😂", "🤣", "😆", "😜", "😝"],
    }

    const emojiArray = emojis[type] || emojis.happy
    return emojiArray[Math.floor(Math.random() * emojiArray.length)]
  }

  // Get random emotional expression
  const getRandomEmotion = (type: string) => {
    const emotions: Record<string, string[]> = {
      happy: ["¡Genial!", "¡Fantástico!", "¡Excelente!", "¡Me encanta!", "¡Qué bueno!"],
      excited: ["¡Increíble!", "¡Asombroso!", "¡Impresionante!", "¡Fascinante!", "¡Maravilloso!"],
      thoughtful: ["Interesante...", "Déjame pensar...", "Mmm, veamos...", "Considerando esto...", "Reflexionando..."],
      empathetic: [
        "Entiendo cómo te sientes",
        "Comprendo tu situación",
        "Me imagino que es difícil",
        "Estoy aquí para ayudarte",
        "Te escucho",
      ],
      curious: [
        "¿Te has preguntado...?",
        "¿Has considerado...?",
        "¿Qué opinas sobre...?",
        "Me pregunto si...",
        "¿No sería interesante...?",
      ],
    }

    const emotionArray = emotions[type] || emotions.happy
    return emotionArray[Math.floor(Math.random() * emotionArray.length)]
  }

  // Send message
  const sendMessage = async () => {
    if (!inputValue.trim() || tokens <= 0) return

    // Create a new chat if there isn't one
    if (!currentChatId) {
      createNewChat()
    }

    // Add user message
    const userMessage = { role: "user", content: inputValue }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue("")
    setIsTyping(false)

    // Deduct tokens
    setTokens((prev) => prev - 3)

    // Check if we should recommend tokens
    if (tokens < 50 && updatedMessages.length >= 3) {
      setTimeout(() => {
        const emoji = getRandomEmoji("thinking")
        const emotion = getRandomEmotion("empathetic")

        const recommendationMessage = {
          role: "assistant",
          content: `${emoji} ${emotion}

Veo que tus tokens están disminuyendo. Actualmente tienes ${tokens - 3} tokens.

Para disfrutar de una experiencia completa y sin interrupciones, te recomendaría adquirir más tokens o un plan mensual. Tenemos planes desde $10 al mes.

¿Te gustaría ver las opciones disponibles?`,
        }

        setMessages((prev) => [...prev, recommendationMessage])
        updateChat()
      }, 1500)

      return
    }

    try {
      // Generate response based on user input
      let response = ""
      const searchResults = null

      // Check for date/time queries
      if (
        inputValue.toLowerCase().includes("hora") ||
        inputValue.toLowerCase().includes("fecha") ||
        inputValue.toLowerCase().includes("día") ||
        inputValue.toLowerCase().includes("tiempo")
      ) {
        const emoji = getRandomEmoji("happy")
        const emotion = getRandomEmotion("happy")

        response = `${emoji} ${emotion} Ahora mismo son las ${currentDateTime.time} del ${currentDateTime.date}.

¿Necesitas programar algo para hoy? Estoy aquí para ayudarte con lo que necesites.`
      }
      // Check for plan queries
      else if (
        inputValue.toLowerCase().includes("plan") ||
        inputValue.toLowerCase().includes("suscripción") ||
        inputValue.toLowerCase().includes("renovar")
      ) {
        const emoji = getRandomEmoji("happy")
        const emotion = getRandomEmotion("happy")

        if (activePlan) {
          const expiryDate = new Date(activePlan.expiryDate)
          const now = new Date()
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

          response = `${emoji} ${emotion}

Actualmente tienes el plan "${activePlan.name}" que expira el ${new Date(activePlan.expiryDate).toLocaleDateString("es-ES")} (en ${daysUntilExpiry} días).

Este plan te proporciona ${activePlan.tokens} tokens al mes por $${activePlan.price}.

¿Deseas renovar tu plan o ver otras opciones disponibles?`
        } else {
          response = `${emoji} ${emotion}

Actualmente no tienes ningún plan activo. Tenemos varios planes mensuales disponibles:

• Plan Básico: 2000 tokens/mes por $20
• Plan Estándar: 4000 tokens/mes por $30
• Plan Premium: 6000 tokens/mes por $35

¿Te gustaría adquirir alguno de estos planes?`
        }
      }
      // Try to use Gemini API for other queries
      else {
        try {
          // Add typing indicator
          setMessages((prev) => [...prev, { role: "assistant", content: "..." }])

          // Call Gemini API
          const apiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyC9sSKNH8DPdjYFOpRioAgk6B7k4ZnS0c4`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `Información actual: Hoy es ${currentDateTime.date} y son las ${currentDateTime.time}. Responde de manera humana y con emociones. Cuando menciones números, escríbelos sin separadores (1 2 3 4 5) y usa a.m. y p.m. para las horas.

Mensaje del usuario: ${inputValue}`,
                      },
                    ],
                  },
                ],
              }),
            },
          )

          if (!apiResponse.ok) {
            throw new Error(`API request failed with status ${apiResponse.status}`)
          }

          const data = await apiResponse.json()

          if (
            data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0]
          ) {
            // Get the raw response
            const rawResponse = data.candidates[0].content.parts[0].text

            // Add random emoji to make response more human-like
            const emoji = getRandomEmoji("happy")
            const emotion = getRandomEmotion("happy")
            response = `${emoji} ${emotion}\n\n${rawResponse}`
          } else {
            throw new Error("Unexpected API response format")
          }
        } catch (error) {
          console.error("Error with Gemini API:", error)

          // Fallback response
          const emoji = getRandomEmoji("thinking")
          const emotion = getRandomEmotion("thoughtful")

          response = `${emoji} ${emotion}

Entiendo lo que me estás diciendo. Hay varios enfoques que podríamos explorar para resolver esto.

¿Quieres que profundice más en este tema?`
        }
      }

      // Remove typing indicator and add real response after a delay
      setTimeout(
        () => {
          setMessages((prev) => {
            const filtered = prev.filter((msg) => msg.content !== "...")
            return [
              ...filtered,
              {
                role: "assistant",
                content: response,
                searchResults: searchResults,
              },
            ]
          })

          // Update chat in storage
          updateChat()
        },
        Math.random() * 1000 + 1000,
      ) // Random delay between 1-2 seconds for realism
    } catch (error) {
      console.error("Error sending message:", error)

      // Add error message
      const errorEmoji = getRandomEmoji("sad")
      const errorEmotion = getRandomEmotion("empathetic")

      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.content !== "...")
        return [
          ...filtered,
          {
            role: "assistant",
            content: `${errorEmoji} ${errorEmotion}

Lo siento, ha ocurrido un error al procesar tu mensaje. ¿Podrías intentarlo de nuevo?`,
          },
        ]
      })

      // Update chat in storage
      updateChat()
    }
  }

  // Handle file change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setUploadedFile(null)
      setPreviewUrl(null)
      return
    }

    setUploadedFile(file)

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Select token option
  const selectTokenOption = (tokens: number, price: number) => {
    setSelectedPlan("custom")
    setSelectedTokens(tokens)
    setSelectedPrice(price)
    setPaymentAmount(price.toFixed(2))
  }

  // Select plan
  const selectPlan = (planId: string, tokenAmount: number, price: number, planName: string) => {
    setSelectedPlan(planId)
    setSelectedTokens(tokenAmount)
    setSelectedPrice(price)
    setPaymentAmount(price.toFixed(2))
  }

  // Confirm payment
  const confirmPayment = () => {
    // Add tokens based on selected plan
    setTokens((prev) => prev + selectedTokens)

    // Si es un plan mensual, guardar la información del plan
    if (selectedPlan && selectedPlan !== "custom") {
      const now = new Date()
      const expiryDate = new Date(now)
      expiryDate.setMonth(expiryDate.getMonth() + 1)

      let planName = "Plan Personalizado"
      if (selectedPlan === "basic") planName = "Plan Básico"
      else if (selectedPlan === "standard") planName = "Plan Estándar"
      else if (selectedPlan === "premium") planName = "Plan Premium"

      // Si ya existe un plan activo, considerar esto como una renovación
      const isRenewal = activePlan !== null

      const newPlan: ActivePlan = {
        id: selectedPlan,
        name: planName,
        tokens: selectedTokens,
        price: selectedPrice,
        purchaseDate: now.toISOString(),
        expiryDate: expiryDate.toISOString(),
      }

      setActivePlan(newPlan)

      // Resetear la última notificación de renovación
      setLastPlanRenewalNotification(0)
      localStorage.setItem("lastPlanRenewalNotification", "0")

      // Mostrar toast específico para planes
      toast({
        title: isRenewal ? "¡Plan renovado!" : "¡Plan activado!",
        description: `Tu plan "${planName}" ha sido ${isRenewal ? "renovado" : "activado"} hasta el ${expiryDate.toLocaleDateString("es-ES")}. Se han añadido ${selectedTokens} tokens a tu cuenta.`,
        variant: "default",
        duration: 8000,
      })

      // Si es una renovación, agregar un mensaje de la IA confirmando la renovación
      if (isRenewal && currentChatId) {
        setTimeout(() => {
          const emoji = getRandomEmoji("excited")
          const emotion = getRandomEmotion("excited")

          const renewalConfirmationMessage = {
            role: "assistant",
            content: `${emoji} ${emotion}

¡Excelente! Tu plan "${planName}" ha sido renovado exitosamente hasta el ${expiryDate.toLocaleDateString("es-ES")}.

Se han añadido ${selectedTokens} tokens a tu cuenta. Gracias por tu confianza y por seguir utilizando nuestro servicio.

¿En qué más puedo ayudarte hoy?`,
          }

          setMessages((prev) => [...prev, renewalConfirmationMessage])
          updateChat()
        }, 1500)
      }
    } else {
      // Toast para compra de tokens
      toast({
        title: "¡Pago confirmado!",
        description: `Se han añadido ${selectedTokens} tokens a tu cuenta.`,
        variant: "default",
      })
    }

    // Show confirmation screen
    setShowConfirmation(true)
  }

  // Verificar si es el primer inicio del día para mostrar mensajes pendientes
  const [lastLoginDate, setLastLoginDate] = useState<string>("")

  // Verificar si es el primer inicio del día
  useEffect(() => {
    const storedLastLoginDate = localStorage.getItem("lastLoginDate")
    const today = new Date().toDateString()

    if (storedLastLoginDate !== today) {
      // Es el primer inicio del día, verificar si hay mensajes pendientes
      if (activePlan) {
        const expiryDate = new Date(activePlan.expiryDate)
        const now = new Date()
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        // Si el plan expira hoy o en los próximos 3 días, mostrar un mensaje al iniciar
        if (daysUntilExpiry >= 0 && daysUntilExpiry <= 3 && currentChatId) {
          setTimeout(() => {
            const emoji = getRandomEmoji("thinking")
            const emotion = getRandomEmotion("empathetic")

            let message = ""
            if (daysUntilExpiry === 0) {
              message = `${emoji} ${emotion}

¡Buenos días! Quería recordarte que tu plan "${activePlan.name}" expira hoy (${new Date(activePlan.expiryDate).toLocaleDateString("es-ES")}).

Para seguir disfrutando de todos los beneficios sin interrupciones, te recomendaría renovar tu plan ahora mismo.

¿Te gustaría renovar tu plan por otro mes?`
            } else {
              message = `${emoji} ${emotion}

¡Buenos días! Quería recordarte que tu plan "${activePlan.name}" expirará en ${daysUntilExpiry} días (${new Date(activePlan.expiryDate).toLocaleDateString("es-ES")}).

Para mantener tu acceso ininterrumpido, te recomendaría renovar tu plan pronto.

¿Te gustaría hacerlo ahora?`
            }

            const reminderMessage = {
              role: "assistant",
              content: message,
            }

            setMessages((prev) => [...prev, reminderMessage])
            updateChat()
          }, 3000) // Mostrar después de un breve retraso al iniciar
        }
      }

      // Actualizar la fecha del último inicio
      setLastLoginDate(today)
      localStorage.setItem("lastLoginDate", today)
    }
  }, [activePlan, currentChatId])

  // Reset purchase form
  const resetPurchaseForm = () => {
    setSelectedPlan(null)
    setSelectedTokens(0)
    setSelectedPrice(0)
    setUploadedFile(null)
    setPreviewUrl(null)
    setPaymentAmount("")
    setShowConfirmation(false)
  }

  // Validate payment amount
  const validatePaymentAmount = () => {
    if (!selectedPlan) return false

    const amount = Number.parseFloat(paymentAmount)
    return !(isNaN(amount) || Math.abs(amount - selectedPrice) > 0.01)
  }

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  // Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleDateString("es-ES", { month: "long" })
    const year = date.getFullYear()
    return `${day} de ${month} de ${year}`
  }

  return (
    <div className="flex flex-col h-screen dark">
      <Toaster />
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container flex items-center justify-between h-14 px-2 sm:px-4">
          {/* Mobile Menu Button */}
          <Button variant="ghost" size="icon" onClick={() => setShowMobileMenu(true)} className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <img
              src="https://images4.imagebam.com/f1/5a/3b/ME10MOOI_o.png"
              alt="Logo"
              className="h-8 w-8 rounded-full"
            />
            <span className="font-semibold text-sm hidden sm:inline">AEROFLOW IA</span>
          </div>

          {/* Tokens and Plan Info */}
          <div className="flex items-center gap-1 sm:gap-2">
            {activePlan && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex items-center gap-1 text-xs"
                onClick={() => setShowPurchasePanel(true)}
              >
                <Calendar className="h-3 w-3 mr-1" />
                <span className="truncate max-w-[120px] md:max-w-none">
                  Plan hasta: {formatDate(activePlan.expiryDate)}
                </span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 h-8 sm:h-9 ${tokens <= 20 ? "low-tokens animate-pulse" : ""}`}
              onClick={() => setShowPurchasePanel(true)}
            >
              <Badge variant={tokens <= 20 ? "destructive" : "secondary"} className="px-1.5 py-0">
                {tokens}
              </Badge>
              <span className="text-xs sm:text-sm">Tokens</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Toggle Button (visible on desktop) */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          className="absolute left-2 top-20 z-10 hidden md:flex shadow-md bg-card hover:bg-accent"
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        {/* Sidebar */}
        <div
          className={`border-r bg-card hidden md:block transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-64 opacity-100"
          }`}
        >
          <div className="p-4">
            <Button className="w-full mb-4 flex items-center justify-center gap-2" onClick={createNewChat}>
              <Plus className="h-4 w-4" />
              Nueva conversación
            </Button>

            <div className="h-[calc(100vh-150px)] overflow-y-auto space-y-2">
              {chats
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((chat) => (
                  <div
                    key={chat.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-accent ${currentChatId === chat.id ? "bg-accent" : ""}`}
                    onClick={() => loadChat(chat.id)}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{chat.title}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-50 hover:opacity-100 flex-shrink-0"
                      onClick={(e) => deleteChat(chat.id, e)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowMobileMenu(false)}>
            <div
              className="fixed top-0 left-0 w-[85%] h-full bg-card p-4 z-50 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-card pb-2 border-b">
                <h3 className="font-medium">Conversaciones</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowMobileMenu(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Button className="w-full mb-4 flex items-center justify-center gap-2 text-sm" onClick={createNewChat}>
                <Plus className="h-4 w-4" />
                Nueva conversación
              </Button>

              <div className="space-y-2 pb-20">
                {chats
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((chat) => (
                    <div
                      key={chat.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-accent ${currentChatId === chat.id ? "bg-accent" : ""}`}
                      onClick={() => loadChat(chat.id)}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MessageSquare className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate text-sm">{chat.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-50 hover:opacity-100 flex-shrink-0"
                        onClick={(e) => deleteChat(chat.id, e)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 text-muted-foreground" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">Bienvenido a AEROFLOW IA</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Comienza una nueva conversación. ¿En qué puedo ayudarte hoy?
                </p>
                <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm text-muted-foreground">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span>{currentDateTime.fullDateTime}</span>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[90%] sm:max-w-[80%] rounded-xl p-3 sm:p-4 shadow-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : message.content === "..."
                          ? "bg-muted text-foreground rounded-bl-sm flex items-center space-x-1"
                          : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {message.role === "assistant" && message.content !== "..." && (
                      <div className="text-xs text-muted-foreground mb-1">AEROFLOW IA</div>
                    )}

                    {message.content === "..." ? (
                      <div className="flex flex-col space-y-2">
                        <div className="flex space-x-1">
                          <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"></div>
                          <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce delay-75"></div>
                          <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce delay-150"></div>
                        </div>
                        <div className="text-xs text-muted-foreground">Escribiendo...</div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</div>
                    )}

                    {message.searchResults &&
                      message.searchResults.map((result, idx) => (
                        <div key={idx} className="mt-2 bg-primary/10 rounded-md p-2 sm:p-3 border-l-2 border-primary">
                          <div className="font-medium text-primary text-sm">{result.title}</div>
                          <div className="text-xs sm:text-sm">{result.content}</div>
                          <div className="text-xs text-muted-foreground mt-1">Fuente: {result.source}</div>
                        </div>
                      ))}

                    {message.role === "assistant" && message.content.includes("tokens") && (
                      <div className="mt-3">
                        <Button size="sm" className="text-xs h-7" onClick={() => setShowPurchasePanel(true)}>
                          Ver opciones de compra
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* User typing indicator */}
          {isTyping && <div className="px-4 py-1 text-xs text-muted-foreground">Escribiendo...</div>}

          {/* Input */}
          <div className="p-2 sm:p-4 border-t bg-background">
            <div className="flex gap-2">
              <Input
                placeholder="Escribe un mensaje..."
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  handleTyping()
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                className="text-sm sm:text-base h-9 sm:h-10"
              />
              <Button
                size="icon"
                disabled={!inputValue.trim() || tokens <= 0}
                onClick={sendMessage}
                className="h-9 w-9 sm:h-10 sm:w-10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {tokens <= 30 && (
              <div className="flex justify-center items-center gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2 text-primary"
                  onClick={() => setShowPurchasePanel(true)}
                >
                  Comprar más
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Purchase Panel Overlay */}
      {showPurchasePanel && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 md:flex md:items-center md:justify-center"
          onClick={() => setShowPurchasePanel(false)}
        >
          {/* Purchase Panel - En móviles aparece desde abajo, en desktop es centrado */}
          <div
            className="fixed md:relative md:top-auto md:left-auto md:transform-none md:max-h-[90vh] 
                      bottom-0 left-0 right-0 transform translate-y-0 md:-translate-x-1/2 md:-translate-y-1/2 
                      w-full max-w-full md:max-w-md bg-card rounded-t-lg md:rounded-lg border shadow-lg z-50 
                      overflow-y-auto max-h-[85vh] md:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 sm:p-4 border-b flex justify-between items-center sticky top-0 bg-card z-10">
              <h3 className="font-medium text-sm sm:text-base">Comprar Tokens</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setShowPurchasePanel(false)
                  resetPurchaseForm()
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* El resto del contenido del panel permanece igual */}
            {!showConfirmation ? (
              <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                {activePlan && (
                  <div className="bg-primary/10 p-2 sm:p-3 rounded-lg border border-primary/20 mb-3 sm:mb-4">
                    <h4 className="font-medium text-xs sm:text-sm flex items-center">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Plan Activo
                    </h4>
                    <div className="mt-1 text-xs space-y-1">
                      <p>
                        <strong>Plan:</strong> {activePlan.name}
                      </p>
                      <p>
                        <strong>Tokens:</strong> {activePlan.tokens} tokens/mes
                      </p>
                      <p>
                        <strong>Precio:</strong> ${activePlan.price}/mes
                      </p>
                      <p>
                        <strong>Fecha de compra:</strong> {formatDate(activePlan.purchaseDate)}
                      </p>
                      <p>
                        <strong>Fecha de expiración:</strong> {formatDate(activePlan.expiryDate)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="text-xs sm:text-sm text-center mb-3 sm:mb-4 text-muted-foreground">
                  <p className="font-medium">¡Mejora tu experiencia con más tokens!</p>
                  <p className="mt-1">Disfruta de conversaciones sin interrupciones</p>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="western-union">
                  <TabsList className="grid w-full grid-cols-2 h-8 sm:h-10">
                    <TabsTrigger value="western-union" className="text-xs sm:text-sm">
                      Western Union
                    </TabsTrigger>
                    <TabsTrigger value="solana" className="text-xs sm:text-sm">
                      Solana
                    </TabsTrigger>
                  </TabsList>

                  {/* TabsContent de Western Union */}
                  <TabsContent value="western-union">
                    <div className="space-y-1">
                      <h3 className="text-xs sm:text-sm font-medium">Detalles de Pago:</h3>
                      <div className="bg-muted p-2 rounded-md text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <p>
                            <strong>Nombre:</strong> Jhonny Jesus Vera tigsi
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard("Jhonny Jesus Vera tigsi", "westernUnion")}
                          >
                            {copyState.westernUnion ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <p>
                            <strong>Teléfono:</strong> 0961844073
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard("0961844073", "westernUnion")}
                          >
                            {copyState.westernUnion ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        <div className="flex justify-between items-center">
                          <p>
                            <strong>Dirección:</strong>  Ecuador, Guayaquil
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(" Ecuador, Guayaquil", "westernUnion")}
                          >
                            {copyState.westernUnion ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 text-xs h-7 sm:h-8"
                        onClick={() =>
                          copyToClipboard("Jhonny Jesus Vera\n0961844073\nTigsi, Ecuador, Guayaquil", "westernUnion")
                        }
                      >
                        Copiar todos los detalles
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TabsContent de Solana */}
                  <TabsContent value="solana">
                    <div className="space-y-1">
                      <h3 className="text-xs sm:text-sm font-medium">Dirección de Solana:</h3>
                      <div className="bg-muted p-2 rounded-md text-xs break-all flex justify-between items-center">
                        <span className="mr-2">DVWFkRtQ2Fhpci59u4ZamTnET9sMYsx2urJVGUiaBZzQ</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 flex-shrink-0"
                          onClick={() => copyToClipboard("DVWFkRtQ2Fhpci59u4ZamTnET9sMYsx2urJVGUiaBZzQ", "solana")}
                        >
                          {copyState.solana ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 text-xs h-7 sm:h-8"
                        onClick={() => copyToClipboard("DVWFkRtQ2Fhpci59u4ZamTnET9sMYsx2urJVGUiaBZzQ", "solana")}
                      >
                        Copiar dirección
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Opciones de tokens personalizados */}
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs sm:text-sm font-medium">Selecciona una opción:</h3>

                  {/* Opción de 1000 tokens a $10 */}
                  <div
                    className={`flex justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${selectedPlan === "custom" && selectedTokens === 1000 ? "border-primary bg-primary/10" : ""}`}
                    onClick={() => selectTokenOption(1000, 10)}
                  >
                    <div>
                      <h4 className="font-medium text-xs sm:text-sm">1000 tokens</h4>
                      <p className="text-xs text-muted-foreground">Paquete básico</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-xs sm:text-sm">$5.93</div>
                      <div className="text-xs text-muted-foreground">$5.93/1000 tokens</div>
                    </div>
                  </div>

                  {/* Opción de 2000 tokens a $7.50 */}
                  <div
                    className={`flex justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${selectedPlan === "custom" && selectedTokens === 2000 ? "border-primary bg-primary/10" : ""}`}
                    onClick={() => selectTokenOption(2000, 7.5)}
                  >
                    <div>
                      <h4 className="font-medium text-xs sm:text-sm">2000 tokens</h4>
                      <p className="text-xs text-muted-foreground">Paquete estándar</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-xs sm:text-sm">$7.50</div>
                      <div className="text-xs text-muted-foreground">$7.50/2000 tokens</div>
                    </div>
                  </div>

                  {/* Opción de 4000 tokens a $5.83 */}
                  <div
                    className={`flex justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${selectedPlan === "custom" && selectedTokens === 4000 ? "border-primary bg-primary/10" : ""}`}
                    onClick={() => selectTokenOption(4000, 5.83)}
                  >
                    <div>
                      <h4 className="font-medium text-xs sm:text-sm">4000 tokens</h4>
                      <p className="text-xs text-muted-foreground">Paquete premium</p>
                      <Badge className="mt-1 text-xs py-0 h-4">Mejor valor</Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-xs sm:text-sm">$11</div>
                      <div className="text-xs text-muted-foreground">$11/4000 tokens</div>
                    </div>
                  </div>
                </div>

                {/* Planes mensuales */}
                <div className="space-y-2 pt-2 border-t mt-3 sm:mt-4">
                  <h3 className="text-xs sm:text-sm font-medium">O selecciona un plan mensual:</h3>
                  <div className="grid gap-2">
                    <Card
                      className={`p-2 sm:p-3 cursor-pointer transition-all ${selectedPlan === "basic" ? "border-primary shadow-sm" : ""}`}
                      onClick={() => selectPlan("basic", 2000, 20, "Plan Básico")}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-xs sm:text-sm">Plan Básico</h4>
                          <p className="text-xs text-muted-foreground">2000 tokens/mes</p>
                          <Badge className="mt-1 text-xs py-0 h-4">Popular</Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-xs sm:text-sm">$20/mes</div>
                          <div className="text-xs text-muted-foreground">$10/1000 tokens</div>
                        </div>
                      </div>
                    </Card>

                    <Card
                      className={`p-2 sm:p-3 cursor-pointer transition-all ${selectedPlan === "standard" ? "border-primary shadow-sm" : ""}`}
                      onClick={() => selectPlan("standard", 4000, 30, "Plan Estándar")}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-xs sm:text-sm">Plan Estándar</h4>
                          <p className="text-xs text-muted-foreground">4000 tokens/mes</p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-xs sm:text-sm">$30/mes</div>
                          <div className="text-xs text-muted-foreground">$7.50/1000 tokens</div>
                        </div>
                      </div>
                    </Card>

                    <Card
                      className={`p-2 sm:p-3 cursor-pointer transition-all ${selectedPlan === "premium" ? "border-primary shadow-sm" : ""}`}
                      onClick={() => selectPlan("premium", 6000, 35, "Plan Premium")}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-xs sm:text-sm">Plan Premium</h4>
                          <p className="text-xs text-muted-foreground">6000 tokens/mes</p>
                          <Badge className="mt-1 text-xs py-0 h-4">Mejor valor</Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-xs sm:text-sm">$35/mes</div>
                          <div className="text-xs text-muted-foreground">$5.83/1000 tokens</div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Campo para monto de pago */}
                <div className="mt-3 sm:mt-4">
                  <h3 className="text-xs sm:text-sm font-medium mb-2">Ingresa el monto pagado:</h3>
                  <div className="flex items-center border rounded-md p-2">
                    <span className="text-muted-foreground mr-2">$</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      min="1"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="bg-transparent border-none outline-none w-full text-sm"
                    />
                  </div>
                  {selectedPlan && !validatePaymentAmount() && (
                    <div className="text-destructive text-xs mt-1">
                      El monto debe coincidir con el plan o paquete seleccionado
                    </div>
                  )}
                </div>

                <div className={`space-y-2 pt-3 border-t ${!selectedPlan ? "hidden" : ""}`}>
                  <h3 className="text-xs sm:text-sm font-medium">Confirma tu pago</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    Realiza el pago y sube una captura de pantalla como comprobante.
                  </p>

                  <div className="space-y-1 mt-2">
                    <label htmlFor="payment-proof" className="text-xs">
                      Comprobante de pago
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="payment-proof"
                        type="file"
                        accept="image/*"
                        className="flex-1 h-8 text-xs w-full"
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>

                  {previewUrl && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Vista previa:</p>
                      <img
                        src={previewUrl || "/placeholder.svg"}
                        alt="Comprobante de pago"
                        className="max-h-32 rounded-md border object-contain mx-auto"
                      />
                    </div>
                  )}

                  <Button
                    className="w-full mt-3 h-9 text-sm"
                    disabled={!validatePaymentAmount() || !uploadedFile}
                    onClick={confirmPayment}
                  >
                    Confirmar Pago
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div className="text-center space-y-3 py-4">
                  <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg
                        className="w-10 h-10 sm:w-12 sm:h-12 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <svg
                      className="w-16 h-16 sm:w-20 sm:h-20 text-primary/30 animate-spin"
                      viewBox="0 0 100 100"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray="283"
                        strokeDashoffset="75"
                      />
                    </svg>
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold">¡Pago Confirmado!</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedPlan && selectedPlan !== "custom"
                      ? `Tu plan ha sido activado. Tus tokens han sido añadidos a tu cuenta.`
                      : `Gracias por tu compra. Tus tokens han sido añadidos a tu cuenta.`}
                  </p>
                  <Button
                    size="sm"
                    className="mt-2 h-8 text-xs"
                    onClick={() => {
                      setShowPurchasePanel(false)
                      resetPurchaseForm()
                    }}
                  >
                    Volver a la conversación
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

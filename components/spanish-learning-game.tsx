"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Settings, Volume2, VolumeX, Sparkles } from "lucide-react"
import { DifficultySelector } from "./difficulty-selector"
import { AchievementSystem } from "./achievement-system"
import { SoundManager } from "./sound-manager"
import { BrainrotCollection, getRandomCharacterToUnlock, BRAINROT_CHARACTERS } from "./italian-brainrot-characters"
import { getWordsByDifficulty, SPANISH_WORDS } from "@/lib/words-data"

interface GameWord {
  id: number
  spanish: string
  dutch: string
  image: string
  options: Array<{
    text: string
    image: string
  }> // Updated to include image data for each option
  difficulty: number
  progress?: {
    correct: number
    incorrect: number
    mastery: number
  } | null
}

export function SpanishLearningGame() {
  const [gameMode, setGameMode] = useState<"welcome" | "select" | "playing" | "collection">("welcome") // Added welcome mode as initial state
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null)
  const [words, setWords] = useState<GameWord[]>([])
  const [loading, setLoading] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [gameComplete, setGameComplete] = useState(false)
  const [animationClass, setAnimationClass] = useState("")
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now())
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [playCorrectSound, setPlayCorrectSound] = useState(false)
  const [playIncorrectSound, setPlayIncorrectSound] = useState(false)
  const [playCompleteSound, setPlayCompleteSound] = useState(false)

  const [unlockedCharacters, setUnlockedCharacters] = useState<string[]>([])
  const [newlyUnlockedCharacter, setNewlyUnlockedCharacter] = useState<string | null>(null)
  const [showCharacterUnlock, setShowCharacterUnlock] = useState(false)

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)

  const [gameAnswers, setGameAnswers] = useState<
    Array<{
      question: string
      correctAnswer: string
      userAnswer: string
      isCorrect: boolean
      difficulty: number
      timestamp: number
    }>
  >([])

  useEffect(() => {
    const saved = localStorage.getItem("brainrot-collection")
    if (saved) {
      setUnlockedCharacters(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    if (unlockedCharacters.length > 0) {
      localStorage.setItem("brainrot-collection", JSON.stringify(unlockedCharacters))
    }
  }, [unlockedCharacters])

  useEffect(() => {
    setSpeechSupported("speechSynthesis" in window)
  }, [])

  useEffect(() => {
    if (speechSupported) {
      speakWelcomeMessage()

      // Multiple retry attempts to ensure audio plays
      const retryTimers = [
        setTimeout(() => speakWelcomeMessage(), 100),
        setTimeout(() => speakWelcomeMessage(), 500),
        setTimeout(() => speakWelcomeMessage(), 1000),
      ]

      return () => retryTimers.forEach((timer) => clearTimeout(timer))
    }
  }, [speechSupported]) // Removed gameMode dependency to play on component mount

  useEffect(() => {
    if (currentWord && speechSupported && gameMode === "playing" && !showResult) {
      // Auto-speak the word after a short delay
      const timer = setTimeout(() => {
        speakWord(currentWord.spanish)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [currentWordIndex, gameMode, showResult])

  const getImageForDutchWord = (dutchWord: string): string => {
    const key = dutchWord.toLowerCase().trim()

    // 1) Try words-data.ts mapping (preferred; uses /public assets)
    const byDutch = SPANISH_WORDS.find(w => w.dutch_translation.toLowerCase() === key)
    if (byDutch && byDutch.image_url) {
      return byDutch.image_url
    }

    // 2) Legacy fallback map (external URLs) for any words not in SPANISH_WORDS
    const imageMap: { [key: string]: string } = {
      kat: "/cute-orange-cat.png",
      hond: "/friendly-golden-retriever.png",
      huis: "/cozy-red-roof-house.png",
      water: "/glass-of-water.png",
      eten: "/delicious-meal.png",
      boek: "/open-book.png",
      school: "/traditional-schoolhouse.png",
      familie: "/happy-family.png",
      werk: "/modern-office-workspace.png",
      tijd: "/analog-clock.png",
      raam: "/open-window.png",
      schoen: "/shoe.png",
      ijsje: "/ice-cream.png",
      fiets: "/bicycle.png",
      kleuren: "/color-palette.png",
      restaurant: "/elegant-restaurant.png",
      geneeskunde: "/diverse-medical-equipment.png",
      architectuur: "/abstract-architectural-design.png",
      filosofie: "/philosophical-thinking.png",
      buitengewoon: "/extraordinary-moment.png",
    }

    if (imageMap[key]) return imageMap[key]

    // 3) Final placeholder
    return `/placeholder.svg?height=48&width=48&text=${encodeURIComponent(dutchWord)}`
}


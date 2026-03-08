import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import InterviewDashboard from './page'
import axios from 'axios'

// Mock the Next.js router
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
}))

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock the global store
jest.mock('@/store/useAppStore', () => ({
    useAppStore: (fn: any) => fn({
        targetRole: 'Software Engineer'
    })
}))

describe('Interview Dashboard Page', () => {

    beforeEach(() => {
        jest.clearAllMocks()
        // Mocking getUserMedia
        Object.defineProperty(global.navigator, 'mediaDevices', {
            value: {
                getUserMedia: jest.fn()
            },
            writable: true
        })
        // Mocking scrollIntoView
        window.HTMLElement.prototype.scrollIntoView = jest.fn()
    })

    it('Test 1 (Happy Path - Session Start): Correctly initializes interview and displays greeting', async () => {
        // Mock the start interview API
        mockedAxios.post.mockResolvedValueOnce({
            data: { session_id: 'test-123', greeting: 'Hello! Welcome to your technical round.' }
        })

        // Mock the TTS API
        mockedAxios.post.mockResolvedValueOnce({ data: new Blob(), status: 200 })

        render(<InterviewDashboard />)

        // Click Begin
        const startBtn = screen.getByText('Begin Technical Round')
        fireEvent.click(startBtn)

        // Verify status change
        expect(await screen.findByText('Aura AI')).toBeInTheDocument()
        expect(screen.getByText('Hello! Welcome to your technical round.')).toBeInTheDocument()
    })

    it('Test 2 (Edge Case - Permissions): Gracefully handles microphone access denial', async () => {
        // Mock the session as already started to reach the mic button
        mockedAxios.post.mockResolvedValueOnce({
            data: { session_id: 'test-456', greeting: 'Welcome!' }
        })
        mockedAxios.post.mockResolvedValueOnce({ data: new Blob(), status: 200 })

        render(<InterviewDashboard />)
        fireEvent.click(screen.getByText('Begin Technical Round'))

            // Mock getUserMedia to fail
            ; (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'))

        // Find the mic circle/button
        const micCircle = await screen.findByTestId('mic-circle')
        fireEvent.click(micCircle)

        // Verify error message
        expect(await screen.findByText(/Microphone error: Permission denied/i)).toBeInTheDocument()
    })

    it('Test 3 (Happy Path - AI interaction): Correctly sends text and receives AI follow-up', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { session_id: 'test-789', greeting: 'Ready?' }
        })
        mockedAxios.post.mockResolvedValueOnce({ data: new Blob(), status: 200 }) // TTS

        render(<InterviewDashboard />)
        fireEvent.click(screen.getByText('Begin Technical Round'))

        // Mock the chat response
        mockedAxios.post.mockResolvedValueOnce({
            data: { ai_response: 'Great! Let\'s talk about React hooks.' }
        })
        mockedAxios.post.mockResolvedValueOnce({ data: new Blob(), status: 200 }) // TTS

        // Type an answer
        const input = await screen.findByPlaceholderText(/Type your answer here/i)
        fireEvent.change(input, { target: { value: 'I am ready.' } })
        fireEvent.click(screen.getByRole('button', { name: '' })) // Send button (lucide icon)

        // Verify transcripts
        expect(await screen.findByText('I am ready.')).toBeInTheDocument()
        expect(await screen.findByText("Great! Let's talk about React hooks.")).toBeInTheDocument()
    })
})

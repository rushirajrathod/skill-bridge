import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import OnboardingWizard from './page'
import api from '@/lib/api'

// Mock the Next.js router
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
}))

// Mock the API client
jest.mock('@/lib/api', () => ({
    post: jest.fn(),
    get: jest.fn()
}))

// Mock the global store
jest.mock('@/store/useAppStore', () => {
    let currentSkills: string[] = []
    return {
        useAppStore: () => ({
            step: 1,
            persona: 'graduate',
            currentSkills: currentSkills,
            sessionId: 'test-session',
            setPersona: jest.fn(),
            addSkills: jest.fn((newSkills) => { currentSkills = [...currentSkills, ...newSkills] }),
            resetSkills: jest.fn(),
            setTargetRole: jest.fn(),
        })
    }
})

describe('Onboarding Wizard Chat Page', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('Test 1 (Edge Case - Validation): Prevents moving past Step 2 without adding skills', async () => {
        render(<OnboardingWizard />)

        // Simulate being on Step 2 (by clicking persona first)
        fireEvent.click(screen.getByText('Recent Graduate / Beginner'))

        // Now on step 2, wait for Continue button to appear
        const continueBtn = await screen.findByText('Continue')

        // Verify the button itself is disabled, which is the validation behavior
        expect(continueBtn.closest('button')).toBeDisabled()
    })

    it('Test 2 (Edge Case - AI Failure): Gracefully handles GitHub AI returning no skills', async () => {
        render(<OnboardingWizard />)
        fireEvent.click(screen.getByText('Recent Graduate / Beginner'))

        // Open GitHub mode (wait for animation to reveal the button)
        const githubBtn = await screen.findByText('Sync GitHub')
        fireEvent.click(githubBtn)

            // Mock the API to return empty skills (user repository has no code/skills found)
            ; (api.post as jest.Mock).mockResolvedValueOnce({ data: { skills: [] } })

        const input = await screen.findByPlaceholderText('e.g. octocat')
        fireEvent.change(input, { target: { value: 'emptyuser' } })

        // Trigger sync
        fireEvent.click(screen.getByText('Connect'))

        // Verify correct error message is set
        expect(await screen.findByText('No skills found on that GitHub profile.')).toBeInTheDocument()
    })

    it('Test 3 (Happy Path - AI Usage): Successfully extracts skills from GitHub using MCP Agent', async () => {
        render(<OnboardingWizard />)
        fireEvent.click(screen.getByText('Recent Graduate / Beginner'))

        // Open GitHub mode (wait for animation to reveal the button)
        const githubBtn = await screen.findByText('Sync GitHub')
        fireEvent.click(githubBtn)

            // Mock the API to simulate the AI agent successfully extracting skills from repos
            ; (api.post as jest.Mock).mockResolvedValueOnce({ data: { skills: ['React', 'TypeScript', 'Node.js'] } })

        const input = await screen.findByPlaceholderText('e.g. octocat')
        fireEvent.change(input, { target: { value: 'validuser' } })

        // Trigger sync
        fireEvent.click(screen.getByText('Connect'))

        // The modal should close and skills should be added (Our mock handles the addSkills call)
        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/github/analyze', { username: 'validuser' })
        })

        // Ensure the failure error message doesn't exist
        expect(screen.queryByText('No skills found on that GitHub profile.')).not.toBeInTheDocument()
    })
})

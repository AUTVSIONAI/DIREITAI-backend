import { apiClient } from '../lib/api'

export interface Plan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  stripePriceId: string
  popular?: boolean
}

export interface Subscription {
  id: string
  planId: string
  status: 'active' | 'canceled' | 'past_due' | 'incomplete'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  plan: Plan
}

export interface CheckoutSession {
  url: string
  sessionId: string
}

class PaymentsService {
  async getPlans(): Promise<Plan[]> {
    const response = await apiClient.get('/payments/plans')
    return response.data
  }

  async createCheckoutSession(planId: string): Promise<CheckoutSession> {
    const response = await apiClient.post('/payments/checkout', {
      planId,
      successUrl: `${window.location.origin}/admin/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/admin/plans`
    })
    return response.data
  }

  async getSubscription(): Promise<Subscription | null> {
    try {
      const response = await apiClient.get('/payments/subscription')
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  }

  async cancelSubscription(): Promise<void> {
    await apiClient.post('/payments/cancel')
  }

  async reactivateSubscription(): Promise<void> {
    await apiClient.post('/payments/reactivate')
  }
}

export const paymentsService = new PaymentsService()
export default paymentsService
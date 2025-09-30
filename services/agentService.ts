import { Project, Secret, ReviewJob } from '../types';

const AGENT_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class AgentService {
  public async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${AGENT_URL}/ping`);
      if (response.ok) {
        const data = await response.json();
        return data.status === 'ok';
      }
      return false;
    } catch (error) {
      console.warn("Local agent is not reachable.", error);
      return false;
    }
  }

  public async startReview(project: Project, secrets: Secret[]): Promise<string> {
    const response = await fetch(`${AGENT_URL}/api/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ project, secrets }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
        throw new Error(errorData.error || `Failed to start review. Server responded with ${response.status}`);
    }

    const data = await response.json();
    return data.reviewId;
  }

  public async getReviewStatus(reviewId: string): Promise<Partial<ReviewJob>> {
    const response = await fetch(`${AGENT_URL}/api/review/${reviewId}/status`);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
        throw new Error(errorData.error || `Failed to get review status. Server responded with ${response.status}`);
    }

    return await response.json();
  }
}

export const agentService = new AgentService();

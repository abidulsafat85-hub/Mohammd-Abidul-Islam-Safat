import { MemberPortalData, AuthUser } from '../types';

export class ApiService {
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('messmate_auth_token');
    const res = await fetch(endpoint, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      ...options,
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.error || `Request failed: ${res.status}`);
    }
    return json;
  }

  // Get full state (Admin)
  static async getFullState(): Promise<any> {
    const res = await this.request<{ success: boolean; data: any }>('/api/mess/state');
    return res.data;
  }

  // Sync state (Admin)
  static async syncState(payload: any): Promise<any> {
    const res = await this.request<{ success: boolean; data: any }>('/api/mess/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  // Get public members list for Member Selection (Returns ONLY id and name)
  static async getPublicMembers(): Promise<{ id: string; name: string }[]> {
    const res = await this.request<{ success: boolean; data: { id: string; name: string }[] }>('/api/mess/members-list');
    return res.data;
  }

  // Verify Admin PIN
  static async verifyAdmin(pin: string): Promise<boolean> {
    const res = await this.request<{ success: boolean; verified: boolean }>('/api/mess/verify-admin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    return res.verified;
  }

  // Verify Member PIN
  static async verifyMember(memberId: string, pin: string): Promise<{ verified: boolean; memberId: string; fullName: string }> {
    const res = await this.request<{ success: boolean; verified: boolean; memberId: string; fullName: string }>(
      '/api/mess/verify-member',
      {
        method: 'POST',
        body: JSON.stringify({ memberId, pin }),
      }
    );
    return res;
  }

  // Get isolated data for an individual member (STRICT ISOLATION)
  static async getMemberPortalData(memberId: string, month: string): Promise<MemberPortalData> {
    const res = await this.request<{ success: boolean; data: MemberPortalData }>(
      `/api/mess/member/${encodeURIComponent(memberId)}?month=${encodeURIComponent(month)}`
    );
    return res.data;
  }

  // Member updates their own meal
  static async updateMemberMeal(
    memberId: string,
    date: string,
    mealCount: number,
    lunch?: boolean,
    dinner?: boolean
  ): Promise<any> {
    const res = await this.request<{ success: boolean; data: any }>(
      `/api/mess/member/${encodeURIComponent(memberId)}/meal`,
      {
        method: 'POST',
        body: JSON.stringify({ date, mealCount, lunch, dinner }),
      }
    );
    return res.data;
  }

  // Member submits a deposit
  static async submitMemberDeposit(
    memberId: string,
    payload: { amount: number; paymentMethod?: string; note?: string; date?: string }
  ): Promise<any> {
    const res = await this.request<{ success: boolean; data: any }>(
      `/api/mess/member/${encodeURIComponent(memberId)}/deposit`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  }

  // Member submits a bazar expense
  static async submitMemberBazar(
    memberId: string,
    payload: { amount: number; description: string; category?: string; note?: string; date?: string }
  ): Promise<any> {
    const res = await this.request<{ success: boolean; data: any }>(
      `/api/mess/member/${encodeURIComponent(memberId)}/bazar`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  }

  // Member sets advance vote for tomorrow
  static async setTomorrowVote(
    memberId: string,
    choice: string,
    targetDate: string
  ): Promise<any> {
    const res = await this.request<{ success: boolean; data: any }>(
      `/api/mess/member/${encodeURIComponent(memberId)}/advance-vote`,
      {
        method: 'POST',
        body: JSON.stringify({ choice, targetDate }),
      }
    );
    return res.data;
  }

  // Member updates their PIN
  static async updateMemberPin(memberId: string, oldPin: string, newPin: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/mess/member/${encodeURIComponent(memberId)}/pin`, {
      method: 'POST',
      body: JSON.stringify({ oldPin, newPin }),
    });
  }

  // Admin updates Admin PIN
  static async updateAdminPin(oldPin: string, newPin: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/mess/admin/pin`, {
      method: 'POST',
      body: JSON.stringify({ oldPin, newPin }),
    });
  }

  // Email & Password login:
  // if abidulsafat85@gmail.com -> Admin Panel
  // Any other email -> Member Panel
  static async loginWithEmail(
    email: string,
    password?: string
  ): Promise<{ success: boolean; role: 'admin' | 'member'; memberId?: string; mustChangePassword?: boolean; user: AuthUser; token?: string; error?: string }> {
    const res = await this.request<{
      success: boolean;
      role: 'admin' | 'member';
      memberId?: string;
      mustChangePassword?: boolean;
      user: AuthUser;
      token?: string;
      error?: string;
    }>('/api/mess/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      localStorage.setItem('messmate_auth_token', res.token);
    }
    return res;
  }

  // Admin First Login: Forced Password Change
  static async adminFirstChangePassword(newPassword: string): Promise<{ success: boolean; message?: string; token?: string }> {
    const res = await this.request<{ success: boolean; message: string; token: string }>('/api/mess/auth/admin-first-change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
    if (res.token) {
      localStorage.setItem('messmate_auth_token', res.token);
    }
    return res;
  }

  // Admin Settings: Change Password
  static async adminChangePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    return await this.request<{ success: boolean; message: string }>('/api/mess/auth/admin-change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Logout (Clears session and cookie)
  static async logout(): Promise<void> {
    try {
      await this.request('/api/mess/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('messmate_auth_token');
    localStorage.removeItem('messmate_auth_user');
  }

  // Register New User:
  static async registerUser(
    name: string,
    email: string,
    password?: string,
    phone?: string,
    universityId?: string,
    parentPhone?: string,
    location?: string,
    latitude?: number,
    longitude?: number
  ): Promise<{ success: boolean; role: 'admin' | 'member'; memberId?: string; user: AuthUser; error?: string }> {
    const res = await this.request<{
      success: boolean;
      role: 'admin' | 'member';
      memberId?: string;
      user: AuthUser;
      error?: string;
    }>('/api/mess/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone, universityId, parentPhone, location, latitude, longitude }),
    });
    return res;
  }
}

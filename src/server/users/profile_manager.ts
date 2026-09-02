export interface UserProfile {
  id: string;
  name: string;
  role: "admin" | "family" | "guest";
  preferences?: Record<string, any>;
}

/**
 * Profile Manager
 * Manages the identity of users interacting with Phoenix (you, family members, etc).
 */
export class ProfileManager {
  private profiles: Map<string, UserProfile> = new Map();

  constructor() {
    // Initializes the default profile (The Creator)
    this.profiles.set("admin_1", {
      id: "admin_1",
      name: "Chefe (Arquiteto)",
      role: "admin",
      preferences: {
        verbose: false,
        theme: "dark"
      }
    });
  }

  public getProfile(userId: string): UserProfile | null {
    return this.profiles.get(userId) || null;
  }

  public createProfile(id: string, name: string, role: UserProfile["role"]): void {
    this.profiles.set(id, { id, name, role, preferences: {} });
  }

  public updatePreferences(userId: string, prefs: Record<string, any>): void {
    const profile = this.profiles.get(userId);
    if (profile) {
      profile.preferences = { ...profile.preferences, ...prefs };
      this.profiles.set(userId, profile);
    }
  }
}

export const profileManager = new ProfileManager();

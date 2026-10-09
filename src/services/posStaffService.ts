import { PosStaffMember, PosStaffRole } from '../types';

const POS_ACTIVE_STAFF_KEY = 'aj_pos_active_staff_v1';
const POS_TERMINAL_LOCKED_KEY = 'aj_pos_terminal_locked_v1';

// Client-safe default roster without plaintext PINs or badge codes
export const DEFAULT_POS_STAFF: PosStaffMember[] = [
  {
    id: 'stf-01',
    name: 'Aung Kyaw',
    myanmarName: 'အောင်ကျော်',
    role: 'CASHIER',
    avatarColor: '#38BDF8',
    isActive: true,
  },
  {
    id: 'stf-02',
    name: 'Su Myat',
    myanmarName: 'စုမြတ်',
    role: 'LEAD_CASHIER',
    avatarColor: '#A855F7',
    isActive: true,
  },
  {
    id: 'stf-03',
    name: 'Ko Zin',
    myanmarName: 'ကိုဇင် (မန်နေဂျာ)',
    role: 'STUDIO_MANAGER',
    avatarColor: '#F59E0B',
    isActive: true,
  },
  {
    id: 'stf-04',
    name: 'Daw Khin',
    myanmarName: 'ဒေါ်ခင် (ဆိုင်ရှင်)',
    role: 'OWNER',
    avatarColor: '#10B981',
    isActive: true,
  },
];

class PosStaffService {
  private inMemoryActiveStaff: PosStaffMember = DEFAULT_POS_STAFF[0];
  private inMemoryLocked: boolean = false;
  private cachedStaffList: PosStaffMember[] = [...DEFAULT_POS_STAFF];

  public getAllStaff(): PosStaffMember[] {
    return this.cachedStaffList.filter((s) => s.isActive);
  }

  public getStaffById(id: string): PosStaffMember | undefined {
    return this.cachedStaffList.find((s) => s.id === id && s.isActive);
  }

  /**
   * Fetch active staff from server /api/pos/staff
   */
  public async fetchStaffList(): Promise<PosStaffMember[]> {
    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/api/pos/staff', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.staff)) {
            this.cachedStaffList = data.staff;
            return this.getAllStaff();
          }
        }
      } catch (err) {
        console.warn('[StaffService] Failed to fetch staff list from server, using cached roster:', err);
      }
    }
    return this.getAllStaff();
  }

  /**
   * Server-side PIN verification with 5-failure lockout (R5: Offline fallback strictly prohibited).
   */
  public async verifyPinAsync(
    pin: string,
    staffId?: string
  ): Promise<{ success: boolean; staff?: PosStaffMember; error?: string; isLocked?: boolean }> {
    const trimmed = pin.trim();
    if (!trimmed) return { success: false, error: 'PIN is required.' };

    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/api/pos/staff/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: trimmed, staffId }),
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return { success: true, staff: data.staff };
        }
        return {
          success: false,
          error: data.error || 'Incorrect PIN.',
          isLocked: res.status === 423 || data.isLocked,
        };
      } catch (err) {
        console.warn('[StaffService] Server PIN verification unreachable:', err);
        return {
          success: false,
          error: 'အင်တာနက် ပြန်ရမှ ဝန်ထမ်းပြောင်းနိုင်ပါမည်။',
        };
      }
    }

    return {
      success: false,
      error: 'အင်တာနက် ပြန်ရမှ ဝန်ထမ်းပြောင်းနိုင်ပါမည်။',
    };
  }

  /**
   * Server-side manager override verification returning single-use token (R5: Offline fallback strictly prohibited).
   */
  public async verifyManagerOverrideAsync(
    pin: string,
    action?: string
  ): Promise<{ authorized: boolean; overrideToken?: string; manager?: PosStaffMember; error?: string }> {
    const trimmed = pin.trim();
    if (!trimmed) return { authorized: false, error: 'Manager PIN is required.' };

    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/api/pos/staff/manager-override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: trimmed, action }),
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return {
            authorized: true,
            overrideToken: data.overrideToken,
            manager: data.manager,
          };
        }
        return { authorized: false, error: data.error || 'Manager authorization failed.' };
      } catch (err) {
        console.warn('[StaffService] Server manager override unreachable:', err);
        return {
          authorized: false,
          error: 'အင်တာနက် ပြန်ရမှ မန်နေဂျာ အတည်ပြုချက် ရယူနိုင်ပါမည်။',
        };
      }
    }

    return {
      authorized: false,
      error: 'အင်တာနက် ပြန်ရမှ မန်နေဂျာ အတည်ပြုချက် ရယူနိုင်ပါမည်။',
    };
  }

  /**
   * Authenticate staff by 4-digit PIN (Prohibited locally - returns null).
   */
  public authenticateByPin(_pin: string, _staffId?: string): PosStaffMember | null {
    return null;
  }

  /**
   * Authenticate staff by scanning their barcode badge.
   */
  public authenticateByBadge(badgeBarcode: string): PosStaffMember | null {
    const cleaned = badgeBarcode.trim().toUpperCase();
    const matched = this.cachedStaffList.find(
      (s) => s.isActive && s.badgeBarcode?.toUpperCase() === cleaned
    );
    return matched || null;
  }

  /**
   * Verify manager override (Prohibited locally - returns unauthorized).
   */
  public verifyManagerOverride(_pin: string): {
    authorized: boolean;
    manager?: PosStaffMember;
    reason?: string;
  } {
    return {
      authorized: false,
      reason: 'အင်တာနက် ပြန်ရမှ မန်နေဂျာ အတည်ပြုချက် ရယူနိုင်ပါမည်။',
    };
  }

  /**
   * Permission Checks
   */
  public canVoidCart(role: PosStaffRole): boolean {
    return role === 'LEAD_CASHIER' || role === 'STUDIO_MANAGER' || role === 'OWNER';
  }

  public canPerformLargeCashDrop(role: PosStaffRole, amountMMK: number): boolean {
    if (amountMMK <= 50000) return true;
    return role === 'STUDIO_MANAGER' || role === 'OWNER';
  }

  public canCloseShift(role: PosStaffRole): boolean {
    return role === 'LEAD_CASHIER' || role === 'STUDIO_MANAGER' || role === 'OWNER';
  }

  public canManageProducts(role: PosStaffRole): boolean {
    return role === 'STUDIO_MANAGER' || role === 'OWNER';
  }

  public canOverrideDiscounts(role: PosStaffRole): boolean {
    return role === 'STUDIO_MANAGER' || role === 'OWNER';
  }

  /**
   * Active Staff Session Tracking
   */
  public getActiveStaff(): PosStaffMember {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(POS_ACTIVE_STAFF_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as PosStaffMember;
          const fresh = this.getStaffById(parsed.id);
          if (fresh) return fresh;
        } catch {
          // Fall through
        }
      }
    }
    return this.inMemoryActiveStaff;
  }

  public setActiveStaff(staff: PosStaffMember): void {
    this.inMemoryActiveStaff = staff;
    if (typeof window !== 'undefined') {
      localStorage.setItem(POS_ACTIVE_STAFF_KEY, JSON.stringify(staff));
    }
  }

  /**
   * Terminal Lock / Screen Saver State
   */
  public isTerminalLocked(): boolean {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(POS_TERMINAL_LOCKED_KEY) === 'true';
    }
    return this.inMemoryLocked;
  }

  public setTerminalLocked(locked: boolean): void {
    this.inMemoryLocked = locked;
    if (typeof window !== 'undefined') {
      localStorage.setItem(POS_TERMINAL_LOCKED_KEY, locked ? 'true' : 'false');
    }
  }

  public lockTerminal(): void {
    this.setTerminalLocked(true);
  }

  public unlockTerminal(staff: PosStaffMember): void {
    this.setActiveStaff(staff);
    this.setTerminalLocked(false);
  }
}

export const posStaffService = new PosStaffService();

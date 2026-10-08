import { PosStaffMember, PosStaffRole } from '../types';

const POS_ACTIVE_STAFF_KEY = 'aj_pos_active_staff_v1';
const POS_TERMINAL_LOCKED_KEY = 'aj_pos_terminal_locked_v1';

export const DEFAULT_POS_STAFF: PosStaffMember[] = [
  {
    id: 'stf-01',
    name: 'Aung Kyaw',
    myanmarName: 'အောင်ကျော်',
    role: 'CASHIER',
    pin: '1234',
    badgeBarcode: 'STAFF-AK-01',
    avatarColor: '#38BDF8',
    isActive: true,
  },
  {
    id: 'stf-02',
    name: 'Su Myat',
    myanmarName: 'စုမြတ်',
    role: 'LEAD_CASHIER',
    pin: '2345',
    badgeBarcode: 'STAFF-SM-02',
    avatarColor: '#A855F7',
    isActive: true,
  },
  {
    id: 'stf-03',
    name: 'Ko Zin',
    myanmarName: 'ကိုဇင် (မန်နေဂျာ)',
    role: 'STUDIO_MANAGER',
    pin: '9999',
    badgeBarcode: 'STAFF-KZ-03',
    avatarColor: '#F59E0B',
    isActive: true,
  },
  {
    id: 'stf-04',
    name: 'Daw Khin',
    myanmarName: 'ဒေါ်ခင် (ဆိုင်ရှင်)',
    role: 'OWNER',
    pin: '8888',
    badgeBarcode: 'STAFF-DK-04',
    avatarColor: '#10B981',
    isActive: true,
  },
];

class PosStaffService {
  private inMemoryActiveStaff: PosStaffMember = DEFAULT_POS_STAFF[0];
  private inMemoryLocked: boolean = false;

  public getAllStaff(): PosStaffMember[] {
    return DEFAULT_POS_STAFF.filter((s) => s.isActive);
  }

  public getStaffById(id: string): PosStaffMember | undefined {
    return DEFAULT_POS_STAFF.find((s) => s.id === id && s.isActive);
  }

  /**
   * Authenticate staff by 4-digit PIN.
   * If specific staffId is provided, validates that staff's PIN.
   * If omitted, searches across all active staff.
   */
  public authenticateByPin(pin: string, staffId?: string): PosStaffMember | null {
    const trimmed = pin.trim();
    if (!trimmed) return null;

    if (staffId) {
      const staff = this.getStaffById(staffId);
      if (staff && staff.pin === trimmed) {
        return staff;
      }
      return null;
    }

    const matched = DEFAULT_POS_STAFF.find((s) => s.isActive && s.pin === trimmed);
    return matched || null;
  }

  /**
   * Authenticate staff by scanning their barcode badge (e.g. "STAFF-AK-01").
   */
  public authenticateByBadge(badgeBarcode: string): PosStaffMember | null {
    const cleaned = badgeBarcode.trim().toUpperCase();
    const matched = DEFAULT_POS_STAFF.find(
      (s) => s.isActive && s.badgeBarcode?.toUpperCase() === cleaned
    );
    return matched || null;
  }

  /**
   * Verify whether the entered PIN belongs to a Manager or Owner for override approval.
   */
  public verifyManagerOverride(pin: string): {
    authorized: boolean;
    manager?: PosStaffMember;
    reason?: string;
  } {
    const staff = this.authenticateByPin(pin);
    if (!staff) {
      return { authorized: false, reason: 'Invalid PIN entered.' };
    }
    if (staff.role !== 'STUDIO_MANAGER' && staff.role !== 'OWNER') {
      return {
        authorized: false,
        reason: `${staff.name} is a ${staff.role}. Manager or Owner authority required.`,
      };
    }
    return { authorized: true, manager: staff };
  }

  /**
   * Permission Checks
   */
  public canVoidCart(role: PosStaffRole): boolean {
    return role === 'LEAD_CASHIER' || role === 'STUDIO_MANAGER' || role === 'OWNER';
  }

  public canApplyCustomDiscount(role: PosStaffRole): boolean {
    return role === 'STUDIO_MANAGER' || role === 'OWNER';
  }

  public canPerformLargeCashDrop(role: PosStaffRole, amountMMK: number): boolean {
    if (amountMMK <= 50000) return true;
    return role === 'STUDIO_MANAGER' || role === 'OWNER';
  }

  public canCloseShift(role: PosStaffRole): boolean {
    return role === 'LEAD_CASHIER' || role === 'STUDIO_MANAGER' || role === 'OWNER';
  }

  /**
   * Active Staff Session & Lock State
   */
  public getActiveStaff(): PosStaffMember {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(POS_ACTIVE_STAFF_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const found = this.getStaffById(parsed.id);
          if (found) return found;
        }
      } catch {
        // Fallback to in-memory
      }
    }
    return this.inMemoryActiveStaff;
  }

  public setActiveStaff(staff: PosStaffMember): void {
    this.inMemoryActiveStaff = staff;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(POS_ACTIVE_STAFF_KEY, JSON.stringify(staff));
      } catch {
        // Ignored
      }
    }
  }

  public isTerminalLocked(): boolean {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(POS_TERMINAL_LOCKED_KEY) === 'true';
      } catch {
        // Fallback
      }
    }
    return this.inMemoryLocked;
  }

  public lockTerminal(): void {
    this.inMemoryLocked = true;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(POS_TERMINAL_LOCKED_KEY, 'true');
      } catch {
        // Ignored
      }
    }
  }

  public unlockTerminal(staff: PosStaffMember): void {
    this.inMemoryLocked = false;
    this.setActiveStaff(staff);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(POS_TERMINAL_LOCKED_KEY, 'false');
      } catch {
        // Ignored
      }
    }
  }
}

export const posStaffService = new PosStaffService();

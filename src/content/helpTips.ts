/**
 * AJ Studio Desk — Contextual Help Tips Dictionary (Burmese / Myanmar)
 * 
 * Centralized repository for all in-app operational guidance tooltips.
 * Formal Burmese register, short operational guidance without exposing internals.
 */

export interface HelpTipItem {
  id: string;
  title: string;
  mm: string;
  warning?: string;
  en?: string;
}

export const HELP_TIPS: Record<string, HelpTipItem> = {
  // --- Admin Booking Desk ---
  'booking-status-pending-review': {
    id: 'booking-status-pending-review',
    title: 'PENDING_REVIEW',
    mm: 'စပေါ်ငွေလွှဲပြေစာကို စတူဒီယိုတာဝန်ခံမှ စစ်ဆေးအတည်ပြုရန် စောင့်ဆိုင်းနေသော အခြေအနေဖြစ်ပါသည်။ ပြေစာမှန်ကန်ပါက CONFIRMED သို့ ပြောင်းလဲနိုင်ပါသည်။',
    en: 'Awaiting payment slip verification by studio staff before confirming.',
  },
  'booking-status-confirmed': {
    id: 'booking-status-confirmed',
    title: 'CONFIRMED',
    mm: 'စပေါ်ငွေ မှန်ကန်စွာ လက်ခံရရှိပြီး ဘွတ်ကင် အတည်ပြုပြီးသော အခြေအနေဖြစ်ပါသည်။ သတ်မှတ်ချိန်တွင် ရိုက်ကူးရေး စတင်နိုင်ပါသည်။',
    en: 'Deposit verified and booking confirmed for the scheduled slot.',
  },
  'booking-status-in-progress': {
    id: 'booking-status-in-progress',
    title: 'IN_PROGRESS',
    mm: 'ဧည့်သည် ရောက်ရှိပြီး စတူဒီယိုအတွင်း ရိုက်ကူးရေး လက်ရှိ ဆောင်ရွက်နေသော အခြေအနေဖြစ်ပါသည်။',
    en: 'Customer arrived and photo session currently active in the bay.',
  },
  'booking-status-completed': {
    id: 'booking-status-completed',
    title: 'COMPLETED',
    mm: 'ရိုက်ကူးရေး ပြီးဆုံးပြီး ကျန်ငွေရှင်းပြီးသော အခြေအနေဖြစ်ပါသည်။ ဓာတ်ပုံဖိုင်များ ပေးပို့ရန် အဆင်သင့်ဖြစ်ပါသည်။',
    en: 'Session finished, balance settled, and ready for file delivery.',
  },
  'booking-status-cancelled': {
    id: 'booking-status-cancelled',
    title: 'CANCELLED',
    mm: 'ဘွတ်ကင်ကို ဖျက်သိမ်းထားသော အခြေအနေဖြစ်ပါသည်။ သတ်မှတ်အချိန်ကာလအတွင်း စပေါ်ငွေ ပြန်အမ်းမှု စည်းမျဉ်းအတိုင်း စီမံနိုင်ပါသည်။',
    en: 'Booking cancelled. Subject to deposit refund policy timeline.',
  },
  'booking-payment-review': {
    id: 'booking-payment-review',
    title: 'Payment Review',
    mm: 'လွှဲပြေစာပါ ငွေပမာဏ၊ ငွေလွှဲသူအမည်နှင့် ဘဏ် Reference ID တို့ကို တိုက်ဆိုင်စစ်ဆေးသည့် ကဏ္ဍဖြစ်ပါသည်။ စစ်ဆေးပြီးပါက စာရင်းသွင်းနိုင်ပါသည်။',
    en: 'Cross-reference slip amount, sender name, and bank reference ID.',
  },
  'booking-reschedule': {
    id: 'booking-reschedule',
    title: 'Reschedule',
    mm: 'ရိုက်ကူးမည့် နေ့ရက်နှင့် အချိန်ကို ပြောင်းလဲသတ်မှတ်ခြင်းဖြစ်ပါသည်။ ရွေးချယ်သော အချိန်တွင် အခြား ဘွတ်ကင်များနှင့် အချိန်ထပ်ခြင်း (Clash) ရှိမရှိ စနစ်က အလိုအလျောက် စစ်ဆေးပေးပါသည်။',
    warning: 'အခြားဘွတ်ကင်နှင့် ထပ်နေပါက စနစ်မှ အလိုအလျောက် ခွင့်မပြုပါ။',
    en: 'Change date and time slot with automatic booking clash detection.',
  },
  'booking-notes': {
    id: 'booking-notes',
    title: 'Notes',
    mm: 'ဧည့်သည်၏ အထူးတောင်းဆိုချက်များနှင့် စတူဒီယိုဝန်ထမ်းများ အချင်းချင်း သိရှိရန် လိုအပ်သော အချက်အလက်များကို မှတ်သားထားသည့် နေရာဖြစ်ပါသည်။',
    en: 'Special client requests and internal notes for studio crew.',
  },
  'booking-audit-timeline': {
    id: 'booking-audit-timeline',
    title: 'Audit Timeline',
    mm: 'ဘွတ်ကင် အခြေအနေ အဆင့်ဆင့် ပြောင်းလဲခဲ့မှု၊ ငွေလွှဲအတည်ပြုမှုနှင့် ပြင်ဆင်မှု မှတ်တမ်းများကို အချိန်နှင့်တပြေးညီ ကြည့်ရှုနိုင်သည့် မှတ်တမ်းဖြစ်ပါသည်။',
    en: 'Chronological timeline of booking status transitions and edits.',
  },

  // --- Slip Check Results ---
  'slip-result-matched': {
    id: 'slip-result-matched',
    title: 'Slip Matched',
    mm: 'ငွေလွှဲပြေစာပါ ပမာဏနှင့် လိုအပ်သော စပေါ်ငွေ တိကျစွာ ကိုက်ညီပါသည်။ ဝန်ထမ်းအနေဖြင့် စပေါ်ငွေ လက်ခံပြီး Booking ကို CONFIRMED သို့ တိုက်ရိုက် ပြောင်းနိုင်ပါသည်။',
    en: 'Transfer amount matches deposit due exactly.',
  },
  'slip-result-amount-mismatch': {
    id: 'slip-result-amount-mismatch',
    title: 'Amount Differs',
    mm: 'လွှဲထားသော ငွေပမာဏသည် သတ်မှတ်ထားသော စပေါ်ငွေနှင့် ကွာခြားနေပါသည်။ ဧည့်သည်ထံ မေးမြန်း၍ ကျန်ငွေ ထပ်မံလွှဲခိုင်းပါ သို့မဟုတ် စာရင်းညှိနှိုင်းပါ။',
    warning: 'ငွေပမာဏ မကိုက်ညီပါက အတည်မပြုမီ သေချာစွာ စစ်ဆေးပါ။',
    en: 'Transferred amount does not match the expected deposit amount.',
  },
  'slip-result-reused': {
    id: 'slip-result-reused',
    title: 'Reused Slip',
    mm: 'ဤငွေလွှဲပြေစာ Reference ID ကို အခြား ဘွတ်ကင်တစ်ခုတွင် အသုံးပြုပြီးဖြစ်ပါသည်။ ငွေလွှဲအသစ် တောင်းခံရန် လိုအပ်ပါသည်။',
    warning: 'ပြေစာဟောင်း ပြန်သုံးထားသဖြင့် စာရင်းထဲ လက်မခံသင့်ပါ။',
    en: 'This bank transaction reference has already been used in another booking.',
  },
  'slip-result-unreadable': {
    id: 'slip-result-unreadable',
    title: 'Unreadable Slip',
    mm: 'ငွေလွှဲပြေစာ ဓာတ်ပုံ မကြည်လင်ခြင်း သို့မဟုတ် အချက်အလက်များ မဖတ်နိုင်ခြင်းဖြစ်ပါသည်။ ပြေစာပုံ အသစ် ပြန်လည်တင်ခိုင်းပါ။',
    en: 'Slip image is blurred or missing legible payment information.',
  },

  // --- POS Desk ---
  'pos-starting-float': {
    id: 'pos-starting-float',
    title: 'Starting Float',
    mm: 'ဆိုင်းအသစ် စတင်ချိန်တွင် အံဆွဲထဲ ထည့်သွင်းထားသော အကြွေနှင့် အစဦး ငွေပမာဏဖြစ်ပါသည်။ ဆိုင်းပိတ်ချိန် ငွေစာရင်းရှင်းရာတွင် အခြေခံအဖြစ် အသုံးပြုပါသည်။',
    en: 'Opening cash float placed in drawer at the start of shift.',
  },
  'pos-cash-drop': {
    id: 'pos-cash-drop',
    title: 'Cash Drop',
    mm: 'အံဆွဲထဲ ငွေများလာပါက Safe သေတ္တာထဲသို့ ရွှေ့သိမ်းသည့် မှတ်တမ်းဖြစ်ပါသည်။ ၅၀,၀၀၀ ကျပ်ထက် ကျော်လွန်ပါက Manager PIN လိုအပ်ပါသည်။',
    warning: '၅၀,၀၀၀ ကျပ်ထက်ကျော်ပါက Manager Override ခွင့်ပြုချက် လိုပါသည်။',
    en: 'Transfer cash from drawer to safe during shift.',
  },
  'pos-cash-in': {
    id: 'pos-cash-in',
    title: 'Cash In',
    mm: 'ဆိုင်းအတွင်း အပိုအကြွေ လဲလှယ်ထည့်သွင်းခြင်း သို့မဟုတ် ငွေအပို ဖြည့်သွင်းခြင်းကို မှတ်တမ်းတင်ရန် အသုံးပြုပါသည်။',
    en: 'Add additional cash float or change into the register drawer.',
  },
  'pos-split-payment': {
    id: 'pos-split-payment',
    title: 'Split Payment',
    mm: 'ကျသင့်ငွေကို Cash နှင့် Digital Wallet (KBZPay / WavePay) နှစ်မျိုးခွဲ၍ တစ်ပြိုင်နက် ပေးချေနိုင်သော စနစ်ဖြစ်ပါသည်။',
    en: 'Tender an order using both Cash and Digital payments simultaneously.',
  },
  'pos-x-report': {
    id: 'pos-x-report',
    title: 'X-Report',
    mm: 'ဆိုင်းမပိတ်ခင် လက်ရှိ ရောင်းရငွေကို ကြားဖြတ် စစ်ကြည့်ဖို့ပါ။ ဆိုင်းကို မပိတ်ပါဘူး။',
    en: 'Mid-shift interim sales report without closing the shift.',
  },
  'pos-z-report': {
    id: 'pos-z-report',
    title: 'Z-Report',
    mm: 'ဆိုင်းပိတ်ချိန်မှာ ထုတ်ရတဲ့ နေ့စဉ်ငွေစာရင်း ရှင်းတမ်းပါ။ အံဆွဲထဲ ရေတွက်ရတဲ့ ငွေနဲ့ စနစ်က တွက်ထားတဲ့ ငွေ ကွာခြားချက်ကို ပြပေးပြီး ဆိုင်းကို ပိတ်ပါတယ်။',
    en: 'End-of-day reconciliation report that audits cash and closes the shift.',
  },
  'pos-discrepancy': {
    id: 'pos-discrepancy',
    title: 'Shortage / Overage / Balanced',
    mm: 'ရေတွက်ငွေသည် စနစ်စာရင်းထက် လျော့နည်းပါက Shortage၊ ပိုနေပါက Overage၊ အတိအကျ ကိုက်ညီပါက Balanced အဖြစ် သတ်မှတ်ပါသည်။',
    en: 'Drawer cash count comparison against expected system balance.',
  },
  'pos-manager-override': {
    id: 'pos-manager-override',
    title: 'Manager Override',
    mm: 'သတ်မှတ်ကန့်သတ်ချက် ကျော်လွန်သော ငွေလွှဲပြောင်းမှုများ သို့မဟုတ် ခွင့်ပြုချက် လိုအပ်သော လုပ်ဆောင်ချက်များအတွက် Studio Manager မှ PIN ဖြင့် ခွင့်ပြုပေးခြင်းဖြစ်ပါသည်။',
    en: 'Manager PIN authorization for privileged operations.',
  },
  'pos-offline-indicator': {
    id: 'pos-offline-indicator',
    title: 'Offline Sync',
    mm: 'အင်တာနက် ပြတ်နေချိန် ရောင်းထားတာတွေ ပြန်ချိတ်မိတာနဲ့ အလိုအလျောက် ပို့ပေးပါမယ်။',
    en: 'Transactions saved locally offline will automatically synchronize upon reconnection.',
  },

  // --- Staff & PIN Settings ---
  'staff-role-cashier': {
    id: 'staff-role-cashier',
    title: 'Cashier',
    mm: 'အရောင်းကောင်တာတွင် ပစ္စည်းရောင်းချခြင်း၊ ငွေလက်ခံခြင်းနှင့် ပြေစာထုတ်ပေးခြင်းတို့ကို ဆောင်ရွက်နိုင်ပါသည်။',
    en: 'Ring sales, process payments, and print thermal receipts.',
  },
  'staff-role-lead-cashier': {
    id: 'staff-role-lead-cashier',
    title: 'Lead Cashier',
    mm: 'အရောင်းအပြင် အကြွေလွှဲပြောင်းမှုနှင့် ကြားဖြတ် X-Report စစ်ဆေးခြင်းတို့ကိုပါ ဆောင်ရွက်ခွင့်ရှိပါသည်။',
    en: 'Manage cash drawer, initiate cash in/out, and pull X-Reports.',
  },
  'staff-role-manager': {
    id: 'staff-role-manager',
    title: 'Studio Manager',
    mm: 'ဆိုင်းပိတ် Z-Report ထုတ်ခြင်း၊ အကန့်အသတ်ကျော် ငွေလွှဲ Cash Drop အတည်ပြုခြင်းနှင့် ဝန်ထမ်း စီမံခန့်ခွဲမှု အပြည့်အစုံ ဆောင်ရွက်နိုင်ပါသည်။',
    en: 'Authorize overrides, pull end-of-day Z-Reports, and manage floor staff.',
  },
  'staff-role-owner': {
    id: 'staff-role-owner',
    title: 'Studio Owner',
    mm: 'စတူဒီယို အချက်အလက်များ ပြင်ဆင်ခြင်း၊ ဝန်ထမ်း ခန့်အပ်ခြင်းနှင့် ဘဏ္ဍာရေး အစီရင်ခံစာများ အားလုံးကို အပြည့်အဝ စီမံခန့်ခွဲနိုင်ပါသည်။',
    en: 'Full studio administration, staff provisioning, and financial records.',
  },
  'staff-pin-lock': {
    id: 'staff-pin-lock',
    title: 'PIN Security Lock',
    mm: 'PIN နံပါတ်ကို ၅ ကြိမ် ဆက်တိုက် မှားယွင်းစွာ ရိုက်နှိပ်ပါက စနစ်လုံခြုံရေးအရ အကောင့်ကို အလိုအလျောက် ပိတ်ပင်ထားမည်ဖြစ်ပါသည်။',
    warning: '၅ ကြိမ် မှားယွင်းပါက မန်နေဂျာထံ ပြန်လည်ဖွင့်ခိုင်းရန် လိုပါသည်။',
    en: 'Automatic terminal lockout after 5 consecutive failed PIN attempts.',
  },

  // --- Retail Catalog ---
  'retail-sku': {
    id: 'retail-sku',
    title: 'SKU',
    mm: 'ပစ္စည်းတစ်ခုချင်းစီကို ခွဲခြားမှတ်သားရန် အသုံးပြုသော သီးသန့် ကုဒ်နံပါတ်ဖြစ်ပါသည်။ Barcode Scanner ဖြင့် တိုက်ရိုက် ဖတ်ရှုနိုင်ပါသည်။',
    en: 'Unique inventory stock keeping unit scanned via barcode.',
  },
  'retail-stock-count': {
    id: 'retail-stock-count',
    title: 'Stock Count',
    mm: 'စတူဒီယိုတွင် လက်ရှိ ရောင်းချရန် အသင့်ရှိနေသော ပစ္စည်းအရေအတွက် ဖြစ်ပါသည်။ ရောင်းချပြီးတိုင်း အလိုအလျောက် လျော့နည်းသွားပါမည်။',
    en: 'Current available on-hand inventory count updated after each sale.',
  },
  'retail-low-stock': {
    id: 'retail-low-stock',
    title: 'Low Stock Alert',
    mm: 'သတ်မှတ်အရေအတွက်ထက် လျော့နည်းသွားပါက ပစ္စည်းပြတ်လပ်မှု မဖြစ်ပေါ်စေရန် ကြိုတင်သတိပေးချက် ပြသပေးပါသည်။',
    en: 'Threshold alert indicating item needs replenishment.',
  },
  'retail-lead-time': {
    id: 'retail-lead-time',
    title: 'Lead Time',
    mm: 'ကုန်ပစ္စည်း ပြန်လည်မှာယူရာတွင် စတူဒီယိုသို့ ရောက်ရှိရန် ကြာမြင့်မည့် ခန့်မှန်းရက်အရေအတွက် ဖြစ်ပါသည်။',
    en: 'Estimated restocking turnaround days from supplier.',
  },

  // --- Settings ---
  'settings-printer-width': {
    id: 'settings-printer-width',
    title: 'Printer Width (58mm / 80mm)',
    mm: 'အသုံးပြုသည့် အပူပေး Thermal Printer ၏ စက္ကူအရွယ်အစားကို ရွေးချယ်ရန် ဖြစ်ပါသည်။ စံနှုန်းမှာ ၈၀ မီလီမီတာ သို့မဟုတ် အသေးစား ၅၈ မီလီမီတာ ဖြစ်ပါသည်။',
    en: 'Configure 58mm compact or 80mm standard thermal roll width.',
  },
  'settings-cash-drawer': {
    id: 'settings-cash-drawer',
    title: 'Cash Drawer',
    mm: 'ပြေစာထုတ်ပြီးတိုင်း သို့မဟုတ် ငွေရှင်းပြီးတိုင်း အံဆွဲကို အလိုအလျောက် ပွင့်စေရန် ချိတ်ဆက်မှုဖြစ်ပါသည်။',
    en: 'Trigger drawer kick pulse upon receipt print.',
  },
  'settings-barcode-scanner': {
    id: 'settings-barcode-scanner',
    title: 'Barcode Scanner',
    mm: 'USB သို့မဟုတ် ကြိုးမဲ့ Barcode Scanner ချိတ်ဆက်အသုံးပြုနိုင်ပြီး ကုန်ပစ္စည်း SKU များကို အမြန်ဖတ်ရှုနိုင်ပါသည်။',
    en: 'USB wedge barcode scanner integration for instant product lookup.',
  },
  'settings-telegram-notifications': {
    id: 'settings-telegram-notifications',
    title: 'Telegram Notifications',
    mm: 'ဘွတ်ကင်အသစ် ရောက်ရှိလာပါက သို့မဟုတ် အတည်ပြုပြီးပါက သင့် Telegram သို့ အချိန်နှင့်တပြေးညီ အကြောင်းကြားစာ ပေးပို့ပေးမည့် စနစ်ဖြစ်ပါသည်။',
    en: 'Realtime reservation alerts sent directly to your studio Telegram chat.',
  },
  'settings-studio-branding': {
    id: 'settings-studio-branding',
    title: 'Studio Logo & Name',
    mm: 'ဘွတ်ကင်စာမျက်နှာ၊ ပြေစာနှင့် အစီရင်ခံစာများပေါ်တွင် ပြသမည့် စတူဒီယို အမည်နှင့် တံဆိပ် လိုဂို ဖြစ်ပါသည်။',
    en: 'Studio business identity displayed on public portal and receipts.',
  },

  // --- Demo ---
  'demo-role-picker': {
    id: 'demo-role-picker',
    title: 'Role Picker',
    mm: 'Customer (ဘွတ်ကင်တင်သူ)၊ Studio Admin (ရုံးပိုင်းစီမံသူ) သို့မဟုတ် Cashier (အရောင်းကောင်တာ) စသည့် အခန်းကဏ္ဍ ၃ မျိုးစလုံးကို လက်တွေ့ စမ်းသပ်ကြည့်ရှုနိုင်ပါသည်။',
    en: 'Experience the system from Customer, Studio Admin, and Cashier perspectives.',
  },
  'demo-phone-purpose': {
    id: 'demo-phone-purpose',
    title: 'Phone Number',
    mm: 'AJ Studio Desk အကြောင်း ဆက်သွယ်ပြောပြနိုင်ရန်နှင့် သင်၏ Demo စတူဒီယိုဒေတာကို ၇ ရက်အတွင်း ပြန်လည်ဝင်ရောက်နိုင်စေရန် မေးမြန်းခြင်းဖြစ်ပါသည်။',
    en: 'Used for marketing follow-up and restoring your 7-day demo session.',
  },
  'demo-realtime-test': {
    id: 'demo-realtime-test',
    title: 'Realtime Booking Test',
    mm: 'ဖုန်းဖြင့် ဘွတ်ကင်တင်ကြည့်ပြီး Admin desk တွင် ချက်ချင်း ပေါ်လာသည်ကို အချိန်နှင့်တပြေးညီ စမ်းသပ်ကြည့်ရှုနိုင်ပါသည်။',
    en: 'Try booking on your phone and watch it appear live on Admin desk via SSE.',
  },
};

export function getHelpTip(tipId: string): HelpTipItem | undefined {
  return HELP_TIPS[tipId];
}

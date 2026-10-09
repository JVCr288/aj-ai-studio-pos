import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Search,
  Sparkles,
  ShoppingBag,
  Calendar,
  Layers,
  Printer,
  Barcode,
  WifiOff,
  Coins,
  ShieldCheck,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  Languages,
} from 'lucide-react';

interface StudioUserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultModule?: string;
}

type GuideLang = 'MM' | 'EN';

interface GuideSection {
  id: string;
  mascot: {
    nameEN: string;
    nameMM: string;
    roleEN: string;
    roleMM: string;
    avatar: string; // Emoji character / icon
    bgGradient: string;
    taglineEN: string;
    taglineMM: string;
  };
  titleEN: string;
  titleMM: string;
  subtitleEN: string;
  subtitleMM: string;
  cards: {
    stepNumber?: number;
    titleEN: string;
    titleMM: string;
    icon: string;
    descriptionEN: string;
    descriptionMM: string;
    pointsEN: string[];
    pointsMM: string[];
    proTipEN?: string;
    proTipMM?: string;
    badgeEN?: string;
    badgeMM?: string;
  }[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'overview',
    mascot: {
      nameEN: 'AJ Smart Bot',
      nameMM: 'စမတ် AI အကူကောင်လေး',
      roleEN: 'System AI Guide',
      roleMM: 'စတူဒီယို အထွေထွေ လမ်းညွှန်',
      avatar: '🤖',
      bgGradient: 'from-cyan-500/20 via-sky-500/10 to-blue-600/20',
      taglineEN: 'Welcome to AJ AI Studio POS & Booking Architecture!',
      taglineMM: 'AJ AI Studio POS & Booking ပလပ်ဖောင်းမှ ကြိုဆိုပါသည်!',
    },
    titleEN: 'System Architecture & Quick Overview',
    titleMM: 'စနစ် ခြုံငုံသုံးသပ်ချက်နှင့် အခြေခံ မိတ်ဆက်',
    subtitleEN: 'Enterprise-grade Photography Studio Operations with Offline-First POS & Booking Sync.',
    subtitleMM: 'ဓာတ်ပုံစတူဒီယို ဘွတ်ကင်နှင့် POS ကောင်တာသုံး Enterprise စနစ် အသုံးပြုပုံ။',
    cards: [
      {
        stepNumber: 1,
        titleEN: '1. Customer Booking Experience',
        titleMM: '၁။ ဖောက်သည် အွန်လိုင်း ဘွတ်ကင် စနစ်',
        icon: '📸',
        descriptionEN: 'Clients choose studio packages, select date/time on visual floor plan, and pay deposit via mobile banking (KBZPay, WavePay).',
        descriptionMM: 'ဖောက်သည်များသည် ဓာတ်ပုံ Package ရွေးချယ်ခြင်း၊ ပြက္ခဒိန်နှင့် Floor Plan ပေါ်တွင် အချိန်ရွေးခြင်း၊ စရန်ငွေလွှဲခြင်းများ ပြုလုပ်နိုင်သည်။',
        pointsEN: [
          'Live Bay Occupancy: See available bays in real-time.',
          'AI Slip OCR: Automatic receipt verification for fast approvals.',
          'Digital Studio Pass & QR: Issued instantly upon confirmation.',
        ],
        pointsMM: [
          'အချိန်နှင့်တပြေးညီ Bay နေရာလွတ် ကြည့်ရှုနိုင်ခြင်း။',
          'ငွေလွှဲစလစ် AI OCR ဖြင့် အလိုအလျောက် စစ်ဆေးပေးခြင်း။',
          'ဘွတ်ကင်အောင်မြင်သည်နှင့် QR ကုဒ်ပါ Digital Studio Pass ရရှိခြင်း။',
        ],
        proTipEN: 'Clients can access their finished high-res photos via the Biometric Photo Vault with their PIN.',
        proTipMM: 'ဖောက်သည်များသည် ၎င်းတို့၏ ဓာတ်ပုံများကို Biometric Vault မှ PIN ရိုက်ထည့်၍ အချိန်မရွေး ဒေါင်းလုဒ်ယူနိုင်သည်။',
      },
      {
        stepNumber: 2,
        titleEN: '2. Admin Booking Management',
        titleMM: '၂။ အက်ဒမင် စီမံခန့်ခွဲမှု ကွန်ဆိုးလ်',
        icon: '🛡️',
        descriptionEN: 'Studio operators manage schedule manifests, verify bank slips, reschedule sessions, and monitor revenue telemetry.',
        descriptionMM: 'စတူဒီယို မန်နေဂျာများသည် ဘွတ်ကင်စာရင်းများ စစ်ဆေးခြင်း၊ ငွေလွှဲစလစ်အတည်ပြုခြင်း၊ အချိန်ရွှေ့ဆိုင်းခြင်းများ ပြုလုပ်နိုင်သည်။',
        pointsEN: [
          'SSE Live Stream: Instant popup notification when new booking arrives.',
          'Multi-Tenant Isolation: Complete zero-leak data privacy per studio.',
          'Audit Timeline: Every payment approval and rescheduling is tracked.',
        ],
        pointsMM: [
          'ဘွတ်ကင်အသစ်ဝင်ရောက်ပါက Real-time အသံနှင့် Notification ပြသပေးခြင်း။',
          'ဆိုင်အချင်းချင်း ဒေတာမရောနှောစေသော Multi-tenant စနစ်။',
          'လုပ်ဆောင်ချက်မှတ်တမ်း (Audit Timeline) အပြည့်အစုံ သိမ်းဆည်းပေးခြင်း။',
        ],
        proTipEN: 'Use keyboard shortcut Esc or close drawer to quickly jump between bookings.',
        proTipMM: 'ဘွတ်ကင်စာရင်းများကို အမြန်ကြည့်ရှုရန် Filter Bar နှင့် Search ကို တွဲဖက်အသုံးပြုနိုင်သည်။',
      },
    ],
  },
  {
    id: 'pos_desk',
    mascot: {
      nameEN: 'Aung Kyaw',
      nameMM: 'ကိုအောင်ကျော် (ကောင်တာ သူရဲကောင်း)',
      roleEN: 'Lead POS Cashier',
      roleMM: 'အရောင်းကောင်တာ တာဝန်ခံ',
      avatar: '🧑‍💼',
      bgGradient: 'from-sky-500/20 via-blue-500/10 to-indigo-600/20',
      taglineEN: 'Lightning-fast counter checkout with instant barcode scanning!',
      taglineMM: 'ဘားကုဒ်စကင်နာဖြင့် လျင်မြန်တိကျစွာ အရောင်းစာရင်းဖွင့်ပါ!',
    },
    titleEN: 'POS Desk & Checkout Operations',
    titleMM: 'POS အရောင်းကောင်တာ အသုံးပြုနည်း',
    subtitleEN: 'Walk-ins, Photography Packages, Retail Products, and Equipment Rentals.',
    subtitleMM: 'Walk-in ဧည့်သည်၊ ပက်ကေ့ချ်၊ ကုန်ပစ္စည်းများနှင့် စက်ပစ္စည်း ငှားရမ်းမှု စာရင်းသွင်းခြင်း။',
    cards: [
      {
        stepNumber: 1,
        titleEN: 'Settling Booking Balance',
        titleMM: 'ကြိုတင်ဘွတ်ကင် ကျန်ငွေ ရှင်းတမ်း',
        icon: '🧾',
        descriptionEN: 'When a booked guest arrives, search their 4-digit code (e.g. 8801) in "Check-In" search to load their balance into the cart.',
        descriptionMM: 'ဘွတ်ကင်တင်ထားသော ဧည့်သည် ရောက်ရှိလာပါက Check-In ရှာဖွေရေးတွင် ဘွတ်ကင်နံပါတ် (ဥပမာ- 8801) ရိုက်ထည့်၍ ကျန်ငွေကို Cart ထဲသို့ တိုက်ရိုက် ထည့်သွင်းပါ။',
        pointsEN: [
          'Pre-paid deposit is automatically credited from invoice.',
          'Syncs booking status to CONFIRMED on the server upon payment.',
          'Prints detailed thermal receipt showing advance deposit credit.',
        ],
        pointsMM: [
          'ပေးချေပြီးသော စရန်ငွေကို အလိုအလျောက် ခုနှိမ်ပေးခြင်း။',
          'ငွေရှင်းပြီးသည်နှင့် Server တွင် CONFIRMED အဖြစ် အလိုအလျောက် ပြောင်းလဲပေးခြင်း။',
          'စရန်ငွေခုနှိမ်မှု ပါဝင်သော အသေးစိတ်ပြေစာ ရိုက်နှိပ်ပေးခြင်း။',
        ],
      },
      {
        stepNumber: 2,
        titleEN: 'Barcode Scanning & Add-Ons',
        titleMM: 'ဘားကုဒ်စကင်ဖတ်ခြင်းနှင့် အပိုဝန်ဆောင်မှုများ',
        icon: '⚡',
        descriptionEN: 'Plug in any standard USB or Bluetooth 1D/2D scanner. Aim and scan products (SKU), gear barcodes, or staff badges.',
        descriptionMM: 'မည်သည့် USB / Bluetooth Barcode Scanner မဆို တပ်ဆင်၍ ကုန်ပစ္စည်း SKU၊ ငှားရမ်းပစ္စည်းများ သို့မဟုတ် ဝန်ထမ်းကတ်ကို တိုက်ရိုက် စကင်ဖတ်နိုင်သည်။',
        pointsEN: [
          'Hardware Simulator: Click "Scan Sim" to test barcodes without physical hardware.',
          'Audio Feedback: Distinct high pitch for success, buzz for unknown item.',
          'Overtime & Add-on Presets: 1-click +30m, +1h studio extension buttons.',
        ],
        pointsMM: [
          'Scan Sim ခလုတ်နှိပ်၍ ကွန်ပျူတာပေါ်တွင် Barcode စမ်းသပ်နိုင်ခြင်း။',
          'အောင်မြင်ပါက သာယာသောအသံ (Beep) နှင့် မှားယွင်းပါက သတိပေးသံမြည်ခြင်း။',
          'အချိန်ပို မိနစ် ၃၀၊ ၁ နာရီနှင့် မိတ်ကပ် အပိုဝန်ဆောင်မှုများကို ၁ ချက်နှိပ်ရုံဖြင့် ထည့်နိုင်ခြင်း။',
        ],
      },
      {
        stepNumber: 3,
        titleEN: 'Split & Digital Payments',
        titleMM: 'ငွေသားနှင့် Mobile Pay ပေါင်းစပ်ရှင်းနည်း',
        icon: '💳',
        descriptionEN: 'Accept Cash, KBZPay, WavePay, AYA Pay, or SPLIT payments (e.g. 100,000 MMK Cash + 110,000 MMK KBZPay).',
        descriptionMM: 'ငွေသား၊ KBZPay၊ WavePay၊ AYA Pay အပြင် ငွေသားနှင့် Mobile Pay ခွဲခြားပေးချေနိုင်သော Split Payment စနစ် ပါဝင်သည်။',
        pointsEN: [
          'Instant Change Calculator: Live change due indicator for Cash transactions.',
          'Automatic Drawer Kick: Cash drawer pulses open on Cash & Split checkouts.',
          'Slip AI Scanner: Upload customer digital transfer slip for OCR audit.',
        ],
        pointsMM: [
          'အမ်းငွေ (Change Due) ကို တိကျစွာ အလိုအလျောက် တွက်ချက်ပေးခြင်း။',
          'ငွေသားဖြင့် ရှင်းပါက အံဆွဲကို အလိုအလျောက် ဖွင့်ပေးခြင်း။',
          'Mobile Pay စလစ်ကို ဓာတ်ပုံရိုက်တင်၍ စာရင်းစစ်ဆေးနိုင်ခြင်း။',
        ],
      },
    ],
  },
  {
    id: 'hardware',
    mascot: {
      nameEN: 'Hardware Master Zin',
      nameMM: 'ကိုဇင် (ဟာ့ဒ်ဝဲနှင့် နည်းပညာ တာဝန်ခံ)',
      roleEN: 'Hardware Specialist',
      roleMM: 'နည်းပညာနှင့် စက်ပစ္စည်း ကျွမ်းကျင်သူ',
      avatar: '🖨️',
      bgGradient: 'from-amber-500/20 via-orange-500/10 to-red-600/20',
      taglineEN: 'Direct WebUSB thermal printing with zero driver installations!',
      taglineMM: 'Driver သွင်းစရာမလိုဘဲ WebUSB ဖြင့် တိုက်ရိုက် Print ထုတ်ပါ!',
    },
    titleEN: 'Hardware Driver & Thermal Printing',
    titleMM: 'ESC/POS ပရင်တာနှင့် ငွေအံဆွဲ ချိတ်ဆက်မှု',
    subtitleEN: '58mm / 80mm ESC/POS thermal printers and RJ11/RJ12 cash drawers.',
    subtitleMM: '၅၈မမ နှင့် ၈၀မမ အပူပေးပြေစာ ပရင်တာများနှင့် အလိုအလျောက် ငွေအံဆွဲ။',
    cards: [
      {
        stepNumber: 1,
        titleEN: 'ESC/POS Direct Thermal Printing',
        titleMM: 'WebUSB အသုံးပြု၍ တိုက်ရိုက် Print ထုတ်နည်း',
        icon: '🧾',
        descriptionEN: 'Studio POS communicates directly with USB POS printers via WebUSB, delivering sub-second receipts with auto-cutter.',
        descriptionMM: 'စတူဒီယို POS စနစ်သည် WebUSB နည်းပညာဖြင့် USB ပရင်တာထံသို့ ESC/POS command များကို တိုက်ရိုက်ပေးပို့ပြီး ပြေစာ အမြန်ဆုံး ရိုက်နှိပ်ပေးသည်။',
        pointsEN: [
          'Works natively on Google Chrome and Chromium browsers.',
          'Auto-fallback: If WebUSB is unsupported, smoothly falls back to browser print.',
          'Clean formatting: Dual language typography, dividers, and barcode footers.',
        ],
        pointsMM: [
          'Chrome နှင့် Chromium အခြေပြု Browser များတွင် တိုက်ရိုက် အလုပ်လုပ်ခြင်း။',
          'WebUSB မရရှိပါက Browser ပုံမှန် Print ဖြင့် အလိုအလျောက် အစားထိုး ထုတ်ပေးခြင်း။',
          'သပ်ရပ်သော ပြေစာဒီဇိုင်းနှင့် ဘားကုဒ်ပါရှိခြင်း။',
        ],
      },
      {
        stepNumber: 2,
        titleEN: 'Cash Drawer Dual-Pin Pulse',
        titleMM: 'ငွေအံဆွဲ Dual-Pin Pulse အဖွင့်စနစ်',
        icon: '💰',
        descriptionEN: 'Fires dual-pin kick commands (Pin 2 and Pin 5) to support all 12V and 24V RJ11/RJ12 cash drawers.',
        descriptionMM: 'စျေးကွက်ရှိ ၁၂ဗို့ နှင့် ၂၄ဗို့ RJ11/RJ12 ငွေအံဆွဲအားလုံးနှင့် အဆင်ပြေစေရန် Pin 2 နှင့် Pin 5 နှစ်မျိုးလုံးသို့ အချက်ပြ pulse ပေးပို့သည်။',
        pointsEN: [
          'Automatic Kick: Pops open whenever a cash payment is completed.',
          'Manual Kick: Click "Kick Drawer" button in top header anytime for audits.',
          'Audit Safe: Kicking drawer requires active staff credentials.',
        ],
        pointsMM: [
          'ငွေသားဖြင့် အရောင်းပြီးသည်နှင့် အံဆွဲ အလိုအလျောက် ပွင့်ခြင်း။',
          'Header မှ "Kick Drawer" နှိပ်၍ အံဆွဲကို လိုအပ်သလို အလွယ်တကူ ဖွင့်နိုင်ခြင်း။',
          'စာရင်းစစ်ဆေးရာတွင် အံဆွဲဖွင့်ခြင်း မှတ်တမ်း တည်ရှိခြင်း။',
        ],
      },
    ],
  },
  {
    id: 'offline_sync',
    mascot: {
      nameEN: 'Network Shield Bot',
      nameMM: 'အော့ဖ်လိုင်း ကာကွယ်ရေး ဘော့တ်',
      roleEN: 'Offline Queue Synchronizer',
      roleMM: 'ကွန်ရက် ချိတ်ဆက်မှု ထိန်းသိမ်းသူ',
      avatar: '📶',
      bgGradient: 'from-emerald-500/20 via-teal-500/10 to-cyan-600/20',
      taglineEN: 'Zero downtime! Keep selling even when studio internet goes down.',
      taglineMM: 'အင်တာနက်လိုင်းကျသွားလည်း စိတ်မပူပါနှင့်! ပုံမှန်အတိုင်း ရောင်းချနိုင်ပါသည်။',
    },
    titleEN: 'Offline-First Architecture & Sync',
    titleMM: 'အင်တာနက်မရှိဘဲ သုံးစွဲနိုင်မှုနှင့် Auto-Sync',
    subtitleEN: 'Local FIFO persistent queue with automatic background server synchronization.',
    subtitleMM: 'အင်တာနက်ပြတ်တောက်ချိန်တွင် စက်ထဲ၌ သိမ်းဆည်းပြီး လိုင်းပြန်ရချိန်တွင် Server နှင့် အလိုအလျောက် ချိတ်ဆက်ပေးခြင်း။',
    cards: [
      {
        stepNumber: 1,
        titleEN: 'Seamless Offline Continuation',
        titleMM: 'လိုင်းပြတ်ချိန်တွင် ပုံမှန်ရောင်းချခြင်း',
        icon: '⚡',
        descriptionEN: 'If studio internet drops, the POS header switches to amber "Offline: X queued" badge. Cashiers can continue selling without interruption.',
        descriptionMM: 'အင်တာနက်လိုင်း ပြတ်တောက်သွားပါက Header တွင် "Offline: X queued" ဟူ၍ အဝါရောင်သတိပေးချက်ပြသပြီး အရောင်းစာရင်းများကို ပုံမှန်အတိုင်း ဆက်လက်ဖွင့်နိုင်သည်။',
        pointsEN: [
          'Transactions, receipts, and drawer kicks work 100% locally.',
          'Transactions stored safely in persistent indexed storage.',
          'Zero data loss during unexpected power or network cuts.',
        ],
        pointsMM: [
          'ပြေစာထုတ်ခြင်း၊ အံဆွဲဖွင့်ခြင်းများ ၁၀၀% ပုံမှန် အလုပ်လုပ်ခြင်း။',
          'အရောင်းစာရင်းများကို စက်၏ Local Storage တွင် လုံခြုံစွာ မှတ်သားထားခြင်း။',
          'မီးပျက်ခြင်း သို့မဟုတ် လိုင်းပြတ်ခြင်းကြောင့် စာရင်းမပျောက်ပျက်ခြင်း။',
        ],
      },
      {
        stepNumber: 2,
        titleEN: 'Automatic Cloud Ingestion',
        titleMM: 'အလိုအလျောက် Cloud ထံ ပြန်လည်ပို့ဆောင်ခြင်း',
        icon: '☁️',
        descriptionEN: 'As soon as connection is restored, the offline engine synchronizes all pending transactions to the backend database automatically.',
        descriptionMM: 'အင်တာနက်လိုင်း ပြန်လည်ရရှိသည်နှင့် တပြိုင်နက် ကျန်ရှိနေသော အရောင်းစာရင်းများကို Server API ထံသို့ အလိုအလျောက် Batch ပို့ဆောင်ပေးသည်။',
        pointsEN: [
          'Green Toast Notification confirms how many records synced.',
          'Manual Force Sync: Click "Sync Now" button anytime.',
          'Server bookings update their settlement status seamlessly.',
        ],
        pointsMM: [
          'စာရင်းပေါင်း မည်မျှ Sync ပြီးစီးကြောင်း စိမ်းရောင် Toast ဖြင့် အသိပေးခြင်း။',
          '"Sync" ခလုတ်နှိပ်၍လည်း အချိန်မရွေး ကိုယ်တိုင် ချိတ်ဆက်နိုင်ခြင်း။',
          'Server ရှိ Booking များပါ အလိုအလျောက် အဆင့်မြှင့်တင်ပေးခြင်း။',
        ],
      },
    ],
  },
  {
    id: 'shift_reconciliation',
    mascot: {
      nameEN: 'Daw Khin',
      nameMM: 'ဒေါ်ခင် (စတူဒီယို ပိုင်ရှင်ကြီး)',
      roleEN: 'Studio Proprietor & Auditor',
      roleMM: 'ဆိုင်ပိုင်ရှင်နှင့် ငွေစာရင်းစစ်',
      avatar: '👩‍💼',
      bgGradient: 'from-purple-500/20 via-pink-500/10 to-rose-600/20',
      taglineEN: 'End every shift with perfect balanced books and clear Z-Reports!',
      taglineMM: 'Shift တိုင်းကို တိကျသော စာရင်းရှင်းတမ်း Z-Report ဖြင့် ပိတ်သိမ်းပါ!',
    },
    titleEN: 'Shift Handover & Cash Reconciliation',
    titleMM: 'Shift လွှဲပြောင်းခြင်းနှင့် စာရင်းစစ် Z-Report',
    subtitleEN: 'Opening float, cash drops, change top-ups, live discrepancies, and Z-Reports.',
    subtitleMM: 'အဖွင့်ငွေ (Float)၊ နေ့လယ်ပိုင်း ငွေအပ်ခြင်း (Cash Drop) နှင့် Z-Report စာရွက်ထုတ်ယူခြင်း။',
    cards: [
      {
        stepNumber: 1,
        titleEN: 'Cash Movements (Drops & In)',
        titleMM: 'ငွေထုတ်ယူခြင်း (Drop) နှင့် အကြွေဖြည့်ခြင်း (In)',
        icon: '💸',
        descriptionEN: 'Manage cash movement inside the drawer during busy studio days without corrupting the register balance.',
        descriptionMM: 'တစ်နေ့တာအတွင်း အံဆွဲထဲမှ ငွေပိုများ Safe သို့ အပ်ခြင်း (Drop) နှင့် အမ်းငွေအကြွေ ထပ်ဖြည့်ခြင်း (In) များကို အကြောင်းပြချက်ဖြင့် မှတ်တမ်းတင်နိုင်သည်။',
        pointsEN: [
          'Cash Drop (Paid Out): Safe drop or petty cash expense recording.',
          'Cash In (Float Top-up): Change fund replenishment tracking.',
          'Dynamic Float Formula: Starting + Sales + Cash In - Cash Drops.',
        ],
        pointsMM: [
          'Cash Drop: မန်နေဂျာထံ ငွေလွှဲအပ်ခြင်း သို့မဟုတ် အသေးသုံးငွေ ထုတ်ယူခြင်း။',
          'Cash In: အမ်းငွေမလုံလောက်၍ အံဆွဲထဲသို့ ငွေထပ်ဖြည့်ခြင်း။',
          'မျှော်မှန်းငွေတွက်ချက်မှု: စဖွင့်ငွေ + အရောင်းငွေ + ဖြည့်ငွေ - ထုတ်ငွေ။',
        ],
      },
      {
        stepNumber: 2,
        titleEN: 'Closing Shift & Official Z-Report',
        titleMM: 'Shift ပိတ်သိမ်းခြင်းနှင့် တရားဝင် Z-Report',
        icon: '📜',
        descriptionEN: 'Click "Reconcile / Z-Report". Enter the actual counted cash in drawer. The system instantly detects if the drawer is Balanced, Shortage, or Overage.',
        descriptionMM: 'ကောင်တာသိမ်းချိန်တွင် "Reconcile / Z-Report" နှိပ်၍ လက်ထဲရှိငွေကို ရေတွက်ရိုက်ထည့်ပါ။ စနစ်က လို/ပို (Shortage/Overage) ကို တိုက်ရိုက် စစ်ဆေးပြသပေးမည်။',
        pointsEN: [
          'X-Report: Mid-shift audit snapshot without closing the shift.',
          'Z-Report: Final shift closure, auto-cuts paper and kicks drawer for audit.',
          'History Archive: Access and re-print historical Z-reports anytime.',
        ],
        pointsMM: [
          'X-Report: Shift မပိတ်ဘဲ ကြားဖြတ် စာရင်းစစ်ဆေးနိုင်ခြင်း။',
          'Z-Report: တရားဝင် Shift ပိတ်သိမ်း၍ ပြေစာဖြတ်ကာ အံဆွဲပွင့်ပေးခြင်း။',
          'History Archive: ယခင်ပိတ်ခဲ့သော Shift ဟောင်းများ၏ Z-Report ကို ပြန်လည် Re-print ထုတ်နိုင်ခြင်း။',
        ],
      },
    ],
  },
  {
    id: 'staff_security',
    mascot: {
      nameEN: 'Su Myat',
      nameMM: 'စုမြတ် (ကြီးကြပ်ရေးမှူး)',
      roleEN: 'Shift Supervisor',
      roleMM: 'ဆိုင်းကြီးကြပ်ရေးမှူး',
      avatar: '👩‍💻',
      bgGradient: 'from-emerald-500/20 via-cyan-500/10 to-blue-600/20',
      taglineEN: 'Role-based access control with fast 4-digit PINs & barcode badges!',
      taglineMM: 'PIN နံပါတ်နှင့် ဝန်ထမ်းကတ်ဖြင့် စက္ကန့်ပိုင်းအတွင်း Cashier လဲလှယ်ပါ!',
    },
    titleEN: 'Multi-Staff PIN & Manager Override',
    titleMM: 'ဝန်ထမ်း PIN နံပါတ်နှင့် မန်နေဂျာ အတည်ပြုချက်',
    subtitleEN: 'Cashier roles, fast PIN keypad, badge scan, and elevated permissions.',
    subtitleMM: 'ဝန်ထမ်းအဆင့်အတန်း၊ Touch PIN ကီးဘုတ်၊ ဘားကုဒ်ကတ်နှင့် မန်နေဂျာ အတည်ပြုချက်။',
    cards: [
      {
        stepNumber: 1,
        titleEN: 'Fast PIN Switch & Lock Screen',
        titleMM: 'လျင်မြန်စွာ Staff လဲလှယ်ခြင်းနှင့် Lock ချခြင်း',
        icon: '🔢',
        descriptionEN: 'Switch active cashiers instantly using the on-screen numeric keypad, keyboard digits, or by scanning physical staff barcode badges.',
        descriptionMM: 'ကောင်တာမှူး အလွှဲအပြောင်းပြုလုပ်ရာတွင် Touch Keypad ပေါ်တွင် ၄ လုံး PIN ရိုက်ထည့်၍သော်လည်းကောင်း၊ ဝန်ထမ်းကတ်ကို စကင်ဖတ်၍သော်လည်းကောင်း ချက်ချင်း လဲလှယ်နိုင်သည်။',
        pointsEN: [
          'Aung Kyaw (Cashier) - Standard Cashier Access',
          'Su Myat (Lead Cashier) - Shift Closure Authorization',
          'Ko Zin (Studio Manager) - Manager Override Authority',
          'Daw Khin (Studio Owner) - Full Administrative Access',
        ],
        pointsMM: [
          'ကိုအောင်ကျော် (Cashier) - သာမန် ကောင်တာ အရောင်းတာဝန်',
          'မစုမြတ် (Lead Cashier) - နေ့စဉ် Shift ပိတ်သိမ်းခွင့်',
          'ကိုဇင် (မန်နေဂျာ) - မန်နေဂျာ အတည်ပြုခွင့်အာဏာ',
          'ဒေါ်ခင် (ဆိုင်ရှင်) - စတူဒီယို အုပ်ချုပ်ခွင့် အပြည့်အစုံ',
        ],
        proTipEN: 'Click the Lock icon in the header when stepping away from the desk to prevent unauthorized access.',
        proTipMM: 'ကောင်တာမှ ခေတ္တထသွားချိန်တွင် Header ရှိ Lock ပုံစံလေးကို နှိပ်၍ စက်ကို လုံခြုံစွာ Lock ချထားနိုင်သည်။',
      },
      {
        stepNumber: 2,
        titleEN: 'Manager Override Protection',
        titleMM: 'မန်နေဂျာ အတည်ပြုချက် လိုအပ်သော လုပ်ဆောင်ချက်များ',
        icon: '🛡️',
        descriptionEN: 'Standard cashiers are guarded from high-risk operations. A Manager Override modal prompts for authorization.',
        descriptionMM: 'သာမန် Cashier များ အမှားမဖြစ်စေရန် အရေးကြီးသော လုပ်ဆောင်ချက်များတွင် မန်နေဂျာ PIN တောင်းခံသည်။',
        pointsEN: [
          'Void Cart: Requires Manager Override to clear an active cart with items.',
          'Large Cash Drop (>50k MMK): Requires Manager authorization.',
          'Shift Closure: Lead Cashier or Manager authority required to finalize Z-Report.',
        ],
        pointsMM: [
          'Cart တစ်ခုလုံး ဖျက်သိမ်းခြင်း (Void Cart): မန်နေဂျာ အတည်ပြုချက် လိုအပ်ခြင်း။',
          'ငွေကျပ် ၅ သောင်းထက်ကျော်သော Cash Drop: မန်နေဂျာ PIN လိုအပ်ခြင်း။',
          'Shift ပိတ်သိမ်းခြင်း: Supervisor သို့မဟုတ် Manager အဆင့်သာ လုပ်ဆောင်ခွင့်ရှိခြင်း။',
        ],
      },
    ],
  },
];

export const StudioUserGuideModal: React.FC<StudioUserGuideModalProps> = ({
  isOpen,
  onClose,
  defaultModule = 'overview',
}) => {
  const [lang, setLang] = useState<GuideLang>('MM'); // Default to Myanmar for local staff
  const [activeTab, setActiveTab] = useState<string>(defaultModule);
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const currentSection =
    GUIDE_SECTIONS.find((s) => s.id === activeTab) || GUIDE_SECTIONS[0];

  // Search filter
  const filteredCards = currentSection.cards.filter((card) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      card.titleEN.toLowerCase().includes(query) ||
      card.titleMM.toLowerCase().includes(query) ||
      card.descriptionEN.toLowerCase().includes(query) ||
      card.descriptionMM.toLowerCase().includes(query)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 select-none">
      <div className="relative w-full max-w-5xl h-[92vh] bg-[#071423] border border-[#1E3A4F] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans text-slate-100">
        {/* Top Header Bar */}
        <header className="h-16 bg-[#0A1A2E] border-b border-[#1E3A4F] px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#38BDF8] to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg shadow-sky-500/20 shrink-0">
              📖
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-tight text-[#F1F5F9] truncate">
                  {lang === 'MM' ? 'AJ AI Studio စနစ် အသုံးပြုနည်း လမ်းညွှန်' : 'AJ AI Studio Platform User Guide'}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-mono font-bold">
                  v2.4
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] truncate">
                {lang === 'MM'
                  ? 'ကောင်တာဝန်ထမ်း၊ မန်နေဂျာနှင့် ဆိုင်ရှင်များအတွက် လက်စွဲစာစောင်'
                  : 'Complete Operations Manual for Cashiers, Managers & Studio Owners'}
              </p>
            </div>
          </div>

          {/* Language Switcher & Close Button */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* EN / MM Toggle */}
            <div className="flex items-center bg-[#030F1E] border border-[#1E3A4F] rounded-xl p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLang('MM')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 ${
                  lang === 'MM'
                    ? 'bg-[#38BDF8] text-[#071423] shadow-md font-extrabold'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                <span>🇲🇲</span>
                <span>မြန်မာ</span>
              </button>
              <button
                type="button"
                onClick={() => setLang('EN')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 ${
                  lang === 'EN'
                    ? 'bg-[#38BDF8] text-[#071423] shadow-md font-extrabold'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                <span>🇬🇧</span>
                <span>English</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#1E3A4F] transition-colors cursor-pointer"
              title="Close Guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Body: Sidebar Navigation + Main Reading Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar Navigation */}
          <aside className="w-full md:w-64 bg-[#030F1E] border-b md:border-b-0 md:border-r border-[#1E3A4F] p-3 flex md:flex-col overflow-x-auto md:overflow-y-auto shrink-0 gap-1.5">
            <div className="hidden md:block px-2 py-1.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
              {lang === 'MM' ? 'အဓိက အခန်းကဏ္ဍများ' : 'Operations Modules'}
            </div>

            {GUIDE_SECTIONS.map((sec) => {
              const isSelected = activeTab === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(sec.id);
                    setSearchQuery('');
                  }}
                  className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer whitespace-nowrap md:whitespace-normal shrink-0 ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#102538] to-[#0A1A2E] border border-[#38BDF8]/60 text-[#38BDF8] shadow-md shadow-sky-500/10'
                      : 'text-[#94A3B8] hover:bg-[#071423] hover:text-[#F1F5F9] border border-transparent'
                  }`}
                >
                  <span className="text-xl shrink-0">{sec.mascot.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">
                      {lang === 'MM' ? sec.titleMM : sec.titleEN}
                    </div>
                    <div className="text-[10px] text-[#64748B] font-mono truncate hidden md:block">
                      {lang === 'MM' ? sec.mascot.nameMM : sec.mascot.nameEN}
                    </div>
                  </div>
                  {isSelected && <ChevronRight className="w-3.5 h-3.5 hidden md:block shrink-0" />}
                </button>
              );
            })}
          </aside>

          {/* Main Reading Area */}
          <main className="flex-1 flex flex-col overflow-y-auto bg-[#071423] p-4 sm:p-6 space-y-6">
            {/* Mascot Hero Card */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border border-[#1E3A4F] bg-gradient-to-r ${currentSection.mascot.bgGradient} relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-[#030F1E]/80 border border-[#38BDF8]/30 flex items-center justify-center text-3xl shadow-inner shrink-0">
                  {currentSection.mascot.avatar}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-sky-400 font-mono">
                      {lang === 'MM'
                        ? currentSection.mascot.nameMM
                        : currentSection.mascot.nameEN}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
                      {lang === 'MM'
                        ? currentSection.mascot.roleMM
                        : currentSection.mascot.roleEN}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#F1F5F9] mt-0.5">
                    {lang === 'MM' ? currentSection.titleMM : currentSection.titleEN}
                  </h2>
                  <p className="text-xs text-slate-300/90 mt-1 max-w-xl leading-relaxed">
                    {lang === 'MM'
                      ? currentSection.mascot.taglineMM
                      : currentSection.mascot.taglineEN}
                  </p>
                </div>
              </div>

              {/* Keyword Search within module */}
              <div className="w-full sm:w-64 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={lang === 'MM' ? 'အကြောင်းအရာ ရှာဖွေပါ...' : 'Search within guide...'}
                    className="w-full bg-[#030F1E]/90 border border-[#1E3A4F] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#38BDF8]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Instruction Cards Grid */}
            <div className="space-y-4">
              {filteredCards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-[#030F1E] border border-[#1E3A4F] hover:border-[#38BDF8]/40 rounded-2xl p-4 sm:p-5 transition-all shadow-lg space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-[#102538] border border-[#1E3A4F] flex items-center justify-center text-lg shrink-0">
                        {card.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#F1F5F9]">
                          {lang === 'MM' ? card.titleMM : card.titleEN}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {lang === 'MM' ? card.descriptionMM : card.descriptionEN}
                        </p>
                      </div>
                    </div>

                    {card.badgeMM && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold shrink-0">
                        {lang === 'MM' ? card.badgeMM : card.badgeEN}
                      </span>
                    )}
                  </div>

                  {/* Bullet Points */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                    {(lang === 'MM' ? card.pointsMM : card.pointsEN).map((pt, pIdx) => (
                      <div
                        key={pIdx}
                        className="bg-[#071423] border border-[#1E3A4F]/60 rounded-xl p-2.5 flex items-start space-x-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 mt-0.5" />
                        <span className="text-[11px] text-slate-300 leading-snug">{pt}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pro Tip Callout (if available) */}
                  {(card.proTipMM || card.proTipEN) && (
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5 flex items-start space-x-2.5 text-[11px] text-amber-300">
                      <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold mr-1">
                          {lang === 'MM' ? 'သိမှတ်ဖွယ် လျှို့ဝှက်ချက်:' : 'Pro Tip:'}
                        </span>
                        <span>{lang === 'MM' ? card.proTipMM : card.proTipEN}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {filteredCards.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-xs">
                  {lang === 'MM'
                    ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော လမ်းညွှန်အချက် မတွေ့ရှိပါ။'
                    : 'No guide topics found matching your search.'}
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Footer Bar */}
        <footer className="h-12 bg-[#0A1A2E] border-t border-[#1E3A4F] px-4 sm:px-6 flex items-center justify-between text-xs text-[#94A3B8] shrink-0 select-none">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {lang === 'MM'
                ? 'AJ AI Studio POS System v2.4 • အော့ဖ်လိုင်းနှင့် အွန်လိုင်း အပြည့်အဝ ထောက်ပံ့သည်'
                : 'AJ AI Studio POS System v2.4 • Online & Offline Hybrid Enterprise Edition'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] text-[#38BDF8] font-bold text-xs transition-colors cursor-pointer border border-[#1E3A4F]"
          >
            {lang === 'MM' ? 'လမ်းညွှန်ပိတ်မည်' : 'Close Guide'}
          </button>
        </footer>
      </div>
    </div>
  );
};

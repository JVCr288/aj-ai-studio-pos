import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getTenantConfig } from '../config/tenantConfig';
import { platformConfig } from '../config/platformConfig';
import { PHOTOGRAPHY_PACKAGES } from '../data/mockData';
import { INITIAL_EQUIPMENT_LIST } from '../data/equipmentData';
import { AtmosphereTheme, PhotographyPackage } from '../types';
import {
  Camera,
  Calendar,
  Sparkles,
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  CheckCircle2,
  Box,
  ChevronRight,
  ChevronLeft,
  X,
  User,
  Check,
  Zap,
  Coffee,
  Wifi,
  Car,
  Star,
  Baby,
  HeartHandshake,
  Quote,
  Maximize2,
} from 'lucide-react';

interface StudioLandingPortalProps {
  onEnterBooking: (prefill?: {
    packageId?: string;
    selectedPackage?: PhotographyPackage;
    dateStr?: string;
    timeSlot?: string;
    guestName?: string;
    clientPhone?: string;
    bayAllocation?: string;
    totalAmount?: number;
    depositAmount?: number;
  }) => void;
  onOpenEquipment?: () => void;
  currentTheme?: AtmosphereTheme;
}

// Studio Hero Showcase Slides
const STUDIO_HERO_SLIDES = [
  {
    id: 'bay-alpha',
    tag: 'BAY ALPHA-01',
    title: 'Infinity White Cyclorama & Portrait Suite',
    subtitle: '10-Meter Curved Cyc • Pre-Rigged Profoto Overhead Light Grid • Hair & Makeup Vanity',
    specs: ['20×25ft Seamless Cyc', 'Profoto B10X Dual Rig', 'Air-Conditioned Vanity', 'Sound Absorption Wall'],
    image: '/images/preborn/preborn_hero_01.jpg',
    lightingProfile: 'Soft Organic 5600K Diffused Daylight',
  },
  {
    id: 'bay-beta',
    tag: 'BAY BETA-02',
    title: 'High-Fashion & Commercial Soundstage',
    subtitle: 'Dual Octa Softbox Rig • Motorized 6-Color Paper Rolls • Direct Loading Bay Access',
    specs: ['24×30ft Open Floor', 'Motorized Backdrop System', 'Rolling Equipment Cart', 'Dedicated Prep Area'],
    image: '/images/fashion/fashion_stage_02.jpg',
    lightingProfile: 'High-Key Commercial & Editorial Contrast',
  },
  {
    id: 'bay-gamma',
    tag: 'BAY GAMMA-03',
    title: 'Creative Direction & Cinematic Studio',
    subtitle: 'RGB Gel Atmosphere Suite • High-Performance Hazer Rig • Blackout Velvet Drape',
    specs: ['18×22ft Acoustic Blackout', 'RGBWW Continuous Array', 'Water-base Stage Hazer', 'Sound-Isolated Acoustic'],
    image: '/images/portfolio/portfolio_hero_01.jpg',
    lightingProfile: 'Cinematic Noir & Vibrant RGB Gel Glow',
  },
  {
    id: 'lounge-suite',
    tag: 'LOUNGE & VANITY',
    title: 'Private Client Suite & Tether Lounge',
    subtitle: 'Complimentary Barista Coffee • Fiber High-Speed Wi-Fi • Lossless Digital Review Station',
    specs: ['Private Dressing Suites', 'Garment Steamers on Site', 'Ultra-fast 200Mbps Wi-Fi', 'Artisan Coffee Bar'],
    image: '/images/solo/solo_7.jpg',
    lightingProfile: 'Warm 3000K Ambient Atelier Glow',
  },
];

const PACKAGE_CATEGORIES = [
  { id: 'ALL', label: 'All Packages', icon: Layers },
  { id: 'PRE_BORN', label: '1. Pre-born', icon: Baby },
  { id: 'PRE_WEDDING', label: '2. Pre-wedding', icon: HeartHandshake },
  { id: 'FASHION', label: '3. Fashion', icon: Sparkles },
  { id: 'SOLO', label: '4. Solo', icon: User },
];

const AVAILABLE_SLOTS = [
  '09:00 AM - 11:00 AM',
  '11:00 AM - 01:00 PM',
  '02:00 PM - 04:00 PM',
  '04:00 PM - 06:00 PM',
  '06:30 PM - 08:30 PM',
];

const PHOTOGRAPHER_SHOWCASE_PHOTOS = [
  {
    src: '/images/portfolio/portfolio_hero_01.jpg',
    title: 'Cinematic Noir Silhouette',
    subtitle: 'Dramatic high-contrast chiaroscuro & architectural shadow sculpting in acoustic blackout stage.',
    gear: '50mm f/1.2 • Profoto Dual B10X • Acoustic Blackout Stage',
    year: 'Master Atelier Series',
  },
  {
    src: '/images/portfolio/portfolio_02.jpg',
    title: 'Atmospheric Dual Lighting Atelier',
    subtitle: 'Warm ambient glow against cool gradient strobe contour creating tactile psychological depth.',
    gear: '85mm f/1.4 • Dual Octas • Stage Hazer Mist Rig',
    year: 'Fine-Art Selection',
  },
  {
    src: '/images/portfolio/portfolio_03.jpg',
    title: 'Experimental Shadow & Fine-Art Drama',
    subtitle: 'Minimalist composition exploring tension between form, negative space, and tonal mood.',
    gear: '35mm f/1.4 • Hard Rim Keylight • Grid Honeycomb',
    year: 'Visionary Study',
  },
  {
    src: '/images/portfolio/portfolio_04.jpg',
    title: 'Creative Monochrome & Tone Poetry',
    subtitle: 'Lossless 16-bit tonal transition from deep velvet obsidian to radiant specular highlights.',
    gear: 'Profoto Deep Silver Umbrella • Continuous Daylight Array',
    year: 'Signature Monochrome',
  },
  {
    src: '/images/portfolio/portfolio_05.jpg',
    title: 'High-Contrast Editorial Portraiture',
    subtitle: 'Intimate psychological depth and authentic facial presence without artificial stiffness.',
    gear: 'Prime 105mm f/1.4 • Beauty Dish 70cm • Silver Reflector',
    year: 'Editorial Monograph',
  },
  {
    src: '/images/portfolio/portfolio_06.jpg',
    title: 'Artistic Lens Flare & Dynamic Glow',
    subtitle: 'Optical refraction and cinematic atmospheric bloom crafted live in camera.',
    gear: 'Vintage Glass Characteristic • Ambient Tungsten Key',
    year: 'Experimental Light',
  },
  {
    src: '/images/portfolio/portfolio_07.jpg',
    title: 'Contemporary Staging & Color Harmony',
    subtitle: 'Vibrant color grading and modern fashion staging with continuous color arrays.',
    gear: 'RGBWW Continuous Tubes • Diffused Silk Panel',
    year: 'Haute Direction',
  },
  {
    src: '/images/portfolio/portfolio_08.jpg',
    title: 'Visionary Storytelling & Mood Palette',
    subtitle: 'Every click captures an unrepeatable chapter of human identity and timeless spirit.',
    gear: 'Dual Strobe Freeze • Tethered 4K Color Grade Station',
    year: 'Legend Series',
  },
];

export const StudioLandingPortal: React.FC<StudioLandingPortalProps> = ({
  onEnterBooking,
  onOpenEquipment,
}) => {
  const tenantConfig = getTenantConfig();

  // Hero Slideshow state
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Package category filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Photographer Showcase photo index state
  const [activeShowcaseIdx, setActiveShowcaseIdx] = useState<number>(0);

  // Quick Direct Booking Widget state
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    PHOTOGRAPHY_PACKAGES[0]?.id || 'indoor-portrait-master'
  );
  const [bookingDate, setBookingDate] = useState<string>('18 NOV 2026');
  const [bookingSlot, setBookingSlot] = useState<string>(AVAILABLE_SLOTS[1]);
  const [guestName, setGuestName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [isSubmittingWidget, setIsSubmittingWidget] = useState<boolean>(false);
  const [widgetSuccessMessage, setWidgetSuccessMessage] = useState<string | null>(null);

  // Floor plan modal state
  const [isFloorPlanOpen, setIsFloorPlanOpen] = useState<boolean>(false);

  // Full-Screen Lightbox Modal state
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    images: Array<{
      src: string;
      title: string;
      subtitle?: string;
      bay?: string;
      gear?: string;
      year?: string;
    }>;
    currentIndex: number;
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  });

  const openLightbox = (
    images: Array<{ src: string; title: string; subtitle?: string; bay?: string; gear?: string; year?: string }>,
    index: number
  ) => {
    setLightboxState({
      isOpen: true,
      images,
      currentIndex: index,
    });
  };

  const closeLightbox = () => {
    setLightboxState((prev) => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    if (lightboxState.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxState.isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxState.isOpen) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') {
        setLightboxState((prev) => ({
          ...prev,
          currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length,
        }));
      }
      if (e.key === 'ArrowRight') {
        setLightboxState((prev) => ({
          ...prev,
          currentIndex: (prev.currentIndex + 1) % prev.images.length,
        }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxState.isOpen]);

  // Gallery filter state matching 5 core categories
  const galleryCategories = [
    { id: 'ALL', label: 'All Categories' },
    { id: 'PRE_BORN', label: '1. Pre-born' },
    { id: 'PRE_WEDDING', label: '2. Pre-wedding' },
    { id: 'FASHION', label: '3. Fashion' },
    { id: 'SOLO', label: '4. Solo' },
    { id: 'PORTFOLIO', label: "5. Photographer's Portfolio" },
  ];
  const [activeGalleryTab, setActiveGalleryTab] = useState<string>('ALL');

  // Auto-play hero slides
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % STUDIO_HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  // Selected package object for widget
  const currentSelectedPackage =
    PHOTOGRAPHY_PACKAGES.find((p) => p.id === selectedPackageId) || PHOTOGRAPHY_PACKAGES[0];

  // Filter public packages
  const filteredPackages = PHOTOGRAPHY_PACKAGES.filter((pkg) => {
    if ((pkg as any).status === 'PLACEHOLDER' || (pkg as any).enabled === false) return false;
    if (selectedCategory === 'ALL') return true;
    return pkg.category === selectedCategory;
  });

  const galleryItems = [
    {
      id: 1,
      category: 'FASHION',
      title: 'Ajax Click Haute Editorial',
      bay: 'BAY BETA-02',
      image: '/images/fashion/fashion_hero_01.jpg',
    },
    {
      id: 2,
      category: 'FASHION',
      title: 'Monochrome Fashion Atelier',
      bay: 'BAY BETA-02',
      image: '/images/fashion/fashion_03.jpg',
    },
    {
      id: 3,
      category: 'FASHION',
      title: 'Dual Octas Runway Staging',
      bay: 'BAY BETA-02',
      image: '/images/fashion/fashion_04.jpg',
    },
    {
      id: 4,
      category: 'FASHION',
      title: 'Studio Haute Lookbook Vertical',
      bay: 'BAY BETA-02',
      image: '/images/fashion/fashion_05.jpg',
    },
    {
      id: 5,
      category: 'FASHION',
      title: 'Avant-Garde Lighting Series',
      bay: 'BAY BETA-02',
      image: '/images/fashion/fashion_06.jpg',
    },
    {
      id: 6,
      category: 'FASHION',
      title: 'Commercial Fashion Campaign',
      bay: 'BAY BETA-02',
      image: '/images/fashion/fashion_07.jpg',
    },
    {
      id: 7,
      category: 'PRE_BORN',
      title: 'Maternity Golden Radiance',
      bay: 'BAY ALPHA-01',
      image: '/images/preborn/preborn_hero_01.jpg',
    },
    {
      id: 71,
      category: 'PRE_BORN',
      title: 'Fine-Art Motherhood Atelier',
      bay: 'BAY ALPHA-01',
      image: '/images/preborn/preborn_02.jpg',
    },
    {
      id: 72,
      category: 'PRE_BORN',
      title: 'Timeless Maternity Portraiture',
      bay: 'BAY ALPHA-01',
      image: '/images/preborn/preborn_03.jpg',
    },
    {
      id: 73,
      category: 'PRE_BORN',
      title: 'Pure Glow Studio Silhouette',
      bay: 'BAY ALPHA-01',
      image: '/images/preborn/preborn_04.jpg',
    },
    {
      id: 74,
      category: 'PRE_BORN',
      title: 'Gentle Motherhood Moments',
      bay: 'BAY ALPHA-01',
      image: '/images/preborn/preborn_05.jpg',
    },
    {
      id: 75,
      category: 'PRE_BORN',
      title: 'Ethereal Maternity Editorial',
      bay: 'BAY ALPHA-01',
      image: '/images/preborn/preborn_06.jpg',
    },
    {
      id: 8,
      category: 'PRE_WEDDING',
      title: 'Romantic Couple Cinematic',
      bay: 'BAY BETA-02',
      image: '/images/prewedding/prewedding_hero_01.jpg',
    },
    {
      id: 9,
      category: 'PRE_WEDDING',
      title: 'Eternal Romance Editorial',
      bay: 'BAY BETA-02',
      image: '/images/prewedding/prewedding_portrait_02.jpg',
    },
    {
      id: 10,
      category: 'PRE_WEDDING',
      title: 'Fine-Art Sunset Staging',
      bay: 'BAY BETA-02',
      image: '/images/prewedding/prewedding_03.jpg',
    },
    {
      id: 11,
      category: 'PRE_WEDDING',
      title: 'Classic Bridal Silhouette',
      bay: 'BAY BETA-02',
      image: '/images/prewedding/prewedding_04.jpg',
    },
    {
      id: 12,
      category: 'PRE_WEDDING',
      title: 'Ceremonial Modern Glamour',
      bay: 'BAY BETA-02',
      image: '/images/prewedding/prewedding_05.jpg',
    },
    {
      id: 13,
      category: 'PRE_WEDDING',
      title: 'Atelier Pre-Wedding Story',
      bay: 'BAY BETA-02',
      image: '/images/prewedding/prewedding_06.jpg',
    },
    {
      id: 14,
      category: 'SOLO',
      title: 'High-Key Executive Solo Portrait',
      bay: 'BAY ALPHA-01',
      image: '/images/solo/solo_1.jpg',
    },
    {
      id: 141,
      category: 'SOLO',
      title: 'Cinematic Fashion Solo Studio',
      bay: 'BAY ALPHA-01',
      image: '/images/solo/solo_2.jpg',
    },
    {
      id: 142,
      category: 'SOLO',
      title: 'Editorial Monochrome Solo Profile',
      bay: 'BAY ALPHA-01',
      image: '/images/solo/solo_3.jpg',
    },
    {
      id: 143,
      category: 'SOLO',
      title: 'Studio Mood & Tone Solo Framing',
      bay: 'BAY ALPHA-01',
      image: '/images/solo/solo_4.jpg',
    },
    {
      id: 144,
      category: 'SOLO',
      title: 'Minimalist Softbox Solo Atelier',
      bay: 'BAY ALPHA-01',
      image: '/images/solo/solo_5.jpg',
    },
    {
      id: 145,
      category: 'SOLO',
      title: 'Vibrant Ambient Solo Masterpiece',
      bay: 'BAY ALPHA-01',
      image: '/images/solo/solo_6.jpg',
    },
    {
      id: 146,
      category: 'SOLO',
      title: 'Modern High-Contrast Portrait',
      bay: 'BAY ALPHA-01',
      image: '/images/solo/solo_7.jpg',
    },
    {
      id: 147,
      category: 'SOLO',
      title: 'Studio Lighting Fine-Art Solo',
      bay: 'BAY ALPHA-01',
      image: '/images/solo/solo_8.jpg',
    },
    {
      id: 15,
      category: 'PORTFOLIO',
      title: 'Cinematic Silhouette & Mood Poetry',
      bay: 'BAY GAMMA-03',
      image: '/images/portfolio/portfolio_hero_01.jpg',
    },
    {
      id: 151,
      category: 'PORTFOLIO',
      title: 'Atmospheric Dual Lighting Atelier',
      bay: 'BAY GAMMA-03',
      image: '/images/portfolio/portfolio_02.jpg',
    },
    {
      id: 152,
      category: 'PORTFOLIO',
      title: 'Fine-Art Dramatic Shadow Study',
      bay: 'BAY GAMMA-03',
      image: '/images/portfolio/portfolio_03.jpg',
    },
    {
      id: 153,
      category: 'PORTFOLIO',
      title: 'Creative Monochrome Composition',
      bay: 'BAY GAMMA-03',
      image: '/images/portfolio/portfolio_04.jpg',
    },
    {
      id: 154,
      category: 'PORTFOLIO',
      title: 'High-Contrast Editorial Portraiture',
      bay: 'BAY GAMMA-03',
      image: '/images/portfolio/portfolio_05.jpg',
    },
    {
      id: 155,
      category: 'PORTFOLIO',
      title: 'Artistic Lens Flare & Dynamic Glow',
      bay: 'BAY GAMMA-03',
      image: '/images/portfolio/portfolio_06.jpg',
    },
    {
      id: 156,
      category: 'PORTFOLIO',
      title: 'Contemporary Staging & Color Harmony',
      bay: 'BAY GAMMA-03',
      image: '/images/portfolio/portfolio_07.jpg',
    },
    {
      id: 157,
      category: 'PORTFOLIO',
      title: 'Visionary Narrative & Strobe Precision',
      bay: 'BAY GAMMA-03',
      image: '/images/portfolio/portfolio_08.jpg',
    },
  ];

  const filteredGallery =
    activeGalleryTab === 'ALL'
      ? galleryItems
      : galleryItems.filter((item) => item.category === activeGalleryTab);

  // Handle direct booking widget submission
  const handleDirectWidgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingWidget(true);

    const targetPkg = currentSelectedPackage;
    const nameToSubmit = guestName.trim() || 'Valued Guest';
    const phoneToSubmit = clientPhone.trim() || '+95 9 792 108 421';

    setTimeout(() => {
      setIsSubmittingWidget(false);
      setWidgetSuccessMessage(`Bay ${targetPkg.suiteAllocation} reserved! Redirecting to studio confirmation...`);

      setTimeout(() => {
        onEnterBooking({
          packageId: targetPkg.id,
          selectedPackage: targetPkg,
          dateStr: bookingDate,
          timeSlot: bookingSlot.split(' - ')[0] || '11:00 AM',
          guestName: nameToSubmit,
          clientPhone: phoneToSubmit,
          bayAllocation: targetPkg.suiteAllocation,
          totalAmount: targetPkg.price,
          depositAmount: targetPkg.deposit,
        });
      }, 700);
    }, 400);
  };

  const handleSelectPackageAndScroll = (pkg: PhotographyPackage) => {
    setSelectedPackageId(pkg.id);
    const widgetElem = document.getElementById('direct-booking-widget');
    if (widgetElem) {
      widgetElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      onEnterBooking({
        packageId: pkg.id,
        selectedPackage: pkg,
        bayAllocation: pkg.suiteAllocation,
        totalAmount: pkg.price,
        depositAmount: pkg.deposit,
      });
    }
  };

  const activeSlide = STUDIO_HERO_SLIDES[activeSlideIndex];

  return (
    <div className="w-full text-[#F1F5F9] font-sans selection:bg-[#38BDF8] selection:text-[#071423]">
      {/* 1. CINEMATIC HERO SECTION & PHOTO SHOWCASE */}
      <section
        className="relative min-h-[92vh] flex flex-col justify-between px-4 sm:px-6 lg:px-12 pt-10 pb-12 overflow-hidden border-b border-[#1E293B]"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        {/* Background Image Carousel with Smooth Fade */}
        <div className="absolute inset-0 -z-20 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide.id}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${activeSlide.image})` }}
            />
          </AnimatePresence>
          {/* Multi-layered cinematic gradient scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#030F1E] via-[#030F1E]/80 to-[#030F1E]/55" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(56,189,248,0.15),transparent_60%)]" />
        </div>

        {/* Hero Top Bar: Platform Identity & Pilot Badges */}
        <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-4 z-10 pt-2">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full surface-card/90 border border-[#334155]/80 shadow-2xl backdrop-blur-md">
            <span className="text-[10px] font-mono-code tracking-wider text-[#38BDF8] uppercase font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
              {platformConfig.name}
            </span>
            <span className="text-[#475569]">•</span>
            <span className="text-xs font-semibold text-[#E2E8F0] tracking-wide">
              {tenantConfig.displayName}
            </span>
            <span className="text-xs font-mono-code px-2 py-0.5 rounded-full bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
              YANGON ATELIER
            </span>
          </div>

          {/* Quick Studio Status Pill */}
          <div className="hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-[#07172A]/80 border border-[#1E293B] text-xs font-mono-code text-[#94A3B8]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300 font-medium">STUDIO LIVE:</span>
            <span className="text-[#38BDF8]">3 BAYS AVAILABLE TODAY</span>
          </div>
        </div>

        {/* Hero Middle Content: Headings & Studio Space Spotlight */}
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-end z-10 my-auto py-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#38BDF8]/10 border border-[#38BDF8]/30 text-[#38BDF8] text-xs font-mono-code uppercase tracking-wider">
              <Camera className="w-3.5 h-3.5" />
              <span>Next-Generation Visual Production</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
              Precision Studio &{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#C084FC]">
                Creative Atelier
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#CBD5E1] max-w-2xl leading-relaxed font-light">
              Yangon's premier high-throughput photography facility. Acoustic cyclorama bays, pre-configured Profoto lighting rigs, tethered 4K client capture stations, and instant verified automated access passes.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="#direct-booking-widget"
                className="px-7 py-4 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0369A1] text-[#030F1E] font-bold text-sm sm:text-base shadow-xl hover:shadow-[#38BDF8]/30 transition-all duration-200 flex items-center gap-2 group cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-[#030F1E]" />
                <span>Reserve Studio Bay</span>
                <ArrowRight className="w-4 h-4 text-[#030F1E] group-hover:translate-x-1 transition-transform" />
              </a>

              <button
                onClick={() => setIsFloorPlanOpen(true)}
                className="px-6 py-4 rounded-xl surface-card/90 border border-[#334155] hover:border-[#38BDF8] text-[#F1F5F9] font-medium text-sm sm:text-base hover:bg-[#1E293B]/80 transition-all duration-200 flex items-center gap-2 cursor-pointer backdrop-blur-md"
              >
                <Layers className="w-4 h-4 text-[#38BDF8]" />
                <span>Explore Studio Spaces</span>
              </button>

              <button
                onClick={onOpenEquipment}
                className="px-5 py-4 rounded-xl surface-card/80 border border-[#334155] hover:border-[#38BDF8] text-xs font-mono-code text-[#38BDF8] hover:bg-[#1E293B] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Box className="w-4 h-4" />
                <span>Gear Inventory</span>
              </button>
            </div>
          </div>

          {/* Hero Active Stage Spotlight Card */}
          <div className="lg:col-span-5">
            <motion.div
              key={activeSlide.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="p-6 rounded-2xl bg-[#07172A]/90 backdrop-blur-xl border border-[#334155]/90 shadow-2xl space-y-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-code text-[#38BDF8] font-bold px-2.5 py-1 rounded bg-[#030F1E]/90 border border-[#38BDF8]/30 tracking-wide">
                  {activeSlide.tag}
                </span>
                <span className="text-[11px] font-mono-code text-[#94A3B8] flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  STUDIO SHOWCASE
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">{activeSlide.title}</h3>
                <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">{activeSlide.subtitle}</p>
              </div>

              {/* Stage Specs List */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1E293B]">
                {activeSlide.specs.map((spec, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-[#E2E8F0]">
                    <Check className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                    <span className="truncate">{spec}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between text-xs text-[#94A3B8] font-mono-code">
                <span>{activeSlide.lightingProfile}</span>
                <span className="text-[#38BDF8]">CALIBRATED</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Hero Bottom Bar: Carousel Slide Switchers & Stage Navigators */}
        <div className="max-w-7xl mx-auto w-full z-10 pt-4 border-t border-[#1E293B]/70 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setActiveSlideIndex((prev) => (prev - 1 + STUDIO_HERO_SLIDES.length) % STUDIO_HERO_SLIDES.length)
              }
              aria-label="Previous Slide"
              className="p-2 rounded-lg bg-[#07172A]/80 hover:bg-[#1E293B] border border-[#334155] text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              {STUDIO_HERO_SLIDES.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono-code transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeSlideIndex === idx
                      ? 'bg-[#38BDF8] text-[#030F1E] font-bold shadow-md'
                      : 'bg-[#07172A]/80 hover:bg-[#1E293B] text-[#94A3B8] border border-[#334155]'
                  }`}
                >
                  <span>0{idx + 1}</span>
                  <span className="hidden md:inline">{slide.tag}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setActiveSlideIndex((prev) => (prev + 1) % STUDIO_HERO_SLIDES.length)}
              aria-label="Next Slide"
              className="p-2 rounded-lg bg-[#07172A]/80 hover:bg-[#1E293B] border border-[#334155] text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono-code text-[#64748B]">
            <span>CYCLORAMA / MOTORIZED ROLLS / DUAL OCTAS / 4K TETHER</span>
          </div>
        </div>
      </section>

      {/* 1.5 CORE STUDIO PHOTOGRAPHY CATEGORIES SHOWCASE */}
      <section id="categories-spotlight" className="py-14 px-4 sm:px-6 lg:px-12 bg-gradient-to-b from-[#030F1E] via-[#041222] to-[#030F1E] border-b border-[#1E293B]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#38BDF8]/10 border border-[#38BDF8]/30 text-[#38BDF8] text-xs font-mono-code uppercase font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Specialized Photography Disciplines</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
                Studio Photography Categories
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#94A3B8] max-w-lg font-light leading-relaxed">
              Dedicated lighting stages, motorized backdrops, and specialized atelier environments for all 5 core disciplines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                id: 'PRE_BORN',
                num: '01',
                name: 'Pre-born',
                desc: 'Delicate light, warm lounge & maternity care',
                bay: 'BAY ALPHA-01',
                icon: Baby,
                glow: 'from-pink-500/30 via-rose-500/15 to-transparent',
                badgeBg: 'bg-pink-500/20 text-pink-200 border-pink-400/40',
                bgImage: '/images/preborn/preborn_02.jpg',
              },
              {
                id: 'PRE_WEDDING',
                num: '02',
                name: 'Pre-wedding',
                desc: 'Romantic couple editorial & wardrobe changes',
                bay: 'BAY BETA-02',
                icon: HeartHandshake,
                glow: 'from-amber-500/30 via-orange-500/15 to-transparent',
                badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
                bgImage: '/images/prewedding/prewedding_portrait_02.jpg',
              },
              {
                id: 'FASHION',
                num: '03',
                name: 'Fashion',
                desc: 'Dual Octas, motorized rolls & magazine retouches',
                bay: 'BAY BETA-02',
                icon: Sparkles,
                glow: 'from-purple-500/30 via-indigo-500/15 to-transparent',
                badgeBg: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
                bgImage: '/images/fashion/fashion_hero_01.jpg',
              },
              {
                id: 'SOLO',
                num: '04',
                name: 'Solo',
                desc: 'Executive personal branding & modern portraits',
                bay: 'BAY ALPHA-01',
                icon: User,
                glow: 'from-sky-500/30 via-blue-500/15 to-transparent',
                badgeBg: 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/40',
                bgImage: '/images/fashion/fashion_03.jpg',
              },
              {
                id: 'PORTFOLIO',
                num: '05',
                name: "Photographer's Portfolio",
                desc: 'Acoustic blackout stage, artistic philosophy & master works',
                bay: 'BAY GAMMA-03',
                icon: Camera,
                glow: 'from-emerald-500/30 via-teal-500/15 to-transparent',
                badgeBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
                bgImage: '/images/portfolio/portfolio_02.jpg',
              },
            ].map((cat) => {
              const Icon = cat.icon;
              const isCurrent = selectedCategory === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    if (cat.id === 'PORTFOLIO') {
                      const el = document.getElementById('photographer-showcase');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      setSelectedCategory(cat.id);
                      const el = document.getElementById('packages-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className={`group relative h-80 sm:h-96 rounded-3xl overflow-hidden border transition-all duration-500 cursor-pointer flex flex-col justify-between p-5 shadow-2xl ${
                    isCurrent
                      ? 'border-[#38BDF8] ring-2 ring-[#38BDF8]/60 shadow-[#38BDF8]/25'
                      : 'border-[#1E293B] hover:border-[#38BDF8]/80 hover:shadow-cyan-900/40'
                  }`}
                >
                  {/* Full Visual Background Cover Image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700 -z-20"
                    style={{ backgroundImage: `url(${cat.bgImage})` }}
                  />

                  {/* Multi-stage Glass Vignette & Gradient Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#030F1E] via-[#030F1E]/80 to-black/40 -z-10 group-hover:via-[#030F1E]/70 transition-colors duration-500" />
                  <div className={`absolute top-0 right-0 w-36 h-36 bg-gradient-to-br ${cat.glow} rounded-full blur-2xl -z-10 group-hover:scale-150 transition-transform duration-700`} />

                  {/* Top Header Controls: Frosted Glass Badges */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="w-10 h-10 rounded-2xl bg-[#030F1E]/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg">
                      <Icon className="w-5 h-5 text-[#38BDF8]" />
                    </div>
                    <span className={`text-[10px] font-action-button px-3 py-1 rounded-full border backdrop-blur-md ${cat.badgeBg} shadow-md`}>
                      {cat.bay}
                    </span>
                  </div>

                  {/* Bottom Content & Glass Action Button */}
                  <div className="relative z-10 space-y-2.5">
                    <span className="text-[10px] font-action-button text-[#38BDF8] font-bold tracking-widest block">
                      DISCIPLINE {cat.num}
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold text-white group-hover:text-[#38BDF8] transition-colors font-presentation-body leading-tight">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-[#CBD5E1] font-presentation-body font-light line-clamp-2 leading-relaxed">
                      {cat.desc}
                    </p>

                    {/* Glass Plate Button */}
                    <div className="pt-2">
                      <div className="btn-glass-plate btn-glass-plate-sky font-action-button text-[11px] w-full py-2.5 flex items-center justify-between">
                        <span>{cat.id === 'PORTFOLIO' ? 'Explore Showcase' : 'View Packages'}</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 1.6 PHOTOGRAPHER'S VISION & ARTISTIC PHILOSOPHY SHOWCASE */}
      <section
        id="photographer-showcase"
        className="py-20 px-4 sm:px-6 lg:px-12 bg-gradient-to-b from-[#030F1E] via-[#051527] to-[#030F1E] border-b border-[#1E293B] relative overflow-hidden scroll-mt-6"
      >
        {/* Subtle Ambient Background Glows */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-10 right-0 w-96 h-96 bg-[#38BDF8]/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono-code uppercase tracking-wider font-semibold">
              <Camera className="w-3.5 h-3.5" />
              <span>Lead Artist & Studio Visionary</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              The Art of Preserving Legends
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto text-sm sm:text-base font-light italic">
              "Every single click reveals a unique story and preserving your legends."
            </p>
          </div>

          {/* 2-Column Showcase Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Photographer's Philosophy, Principles & Credo (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Artist Profile Card */}
              <div className="p-6 rounded-3xl surface-card border border-[#1E293B] bg-[#04111F]/90 backdrop-blur-md relative overflow-hidden shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10 shrink-0">
                    <img
                      src="/images/portfolio/portfolio_02.jpg"
                      alt="Htoo Wai"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-mono-code uppercase text-emerald-400 font-semibold tracking-wider">
                      Master Photographer & Director
                    </div>
                    <h3 className="text-xl font-bold text-white mt-0.5">Htoo Wai</h3>
                    <div className="text-xs text-[#94A3B8] font-mono-code">Ajax Click Flagship Studio</div>
                  </div>
                </div>

                {/* Quote Box */}
                <div className="mt-5 p-4 rounded-2xl bg-[#030F1E] border border-[#1E293B] relative">
                  <Quote className="w-6 h-6 text-emerald-400/30 absolute -top-3 -left-2 rotate-180" />
                  <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed italic pl-3">
                    Photography is never about merely capturing an image—it is an intimate dialogue between light, atmosphere, and human presence. Every frame is composed to outlast time.
                  </p>
                </div>

                {/* Quick Credentials / Highlights */}
                <div className="mt-5 grid grid-cols-2 gap-2 pt-4 border-t border-[#1E293B]">
                  <div className="p-2.5 rounded-xl bg-[#030F1E]/60 border border-[#1E293B]">
                    <div className="text-xs font-mono-code text-[#64748B]">Experience</div>
                    <div className="text-sm font-bold text-white">12+ Years Fine-Art</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#030F1E]/60 border border-[#1E293B]">
                    <div className="text-xs font-mono-code text-[#64748B]">Specialty</div>
                    <div className="text-sm font-bold text-emerald-400">Cinematic Noir & Light</div>
                  </div>
                </div>
              </div>

              {/* Three Core Pillars of Philosophy */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono-code uppercase tracking-wider text-[#94A3B8] font-semibold flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Artistic Principles & Philosophy</span>
                </h4>

                <div className="space-y-2.5">
                  <div className="p-4 rounded-2xl bg-[#04111F]/70 border border-[#1E293B] hover:border-emerald-500/40 transition-colors">
                    <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono-code">
                        01
                      </span>
                      <span>The Architecture of Light</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-1.5 leading-relaxed font-light">
                      We treat light as a sculptural medium. In our acoustic blackout studio (BAY GAMMA-03), we shape shadows, gradients, and specular accents to reveal the true depth and character of the subject.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#04111F]/70 border border-[#1E293B] hover:border-emerald-500/40 transition-colors">
                    <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono-code">
                        02
                      </span>
                      <span>Authentic Storytelling & Raw Presence</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-1.5 leading-relaxed font-light">
                      Looking past stiff poses to uncover candid emotion, quiet vulnerability, and commanding presence. Every single click captures a distinct human chapter.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#04111F]/70 border border-[#1E293B] hover:border-emerald-500/40 transition-colors">
                    <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono-code">
                        03
                      </span>
                      <span>Uncompromising Archival Craft</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-1.5 leading-relaxed font-light">
                      High-resolution full-frame acquisition, 16-bit uncompressed color mastery, and museum-grade retouching that preserves your imagery as an enduring heirloom.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveGalleryTab('PORTFOLIO');
                    const el = document.getElementById('gallery-showcase');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex-1 btn-glass-plate btn-glass-plate-sky font-action-button text-xs py-3 flex items-center justify-center gap-2"
                >
                  <span>Explore Gallery Archive</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('direct-booking-widget');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="btn-glass-plate font-action-button text-xs py-3 px-5"
                >
                  Reserve Bay
                </button>
              </div>
            </div>

            {/* Right Column: Interactive Master Photo Showcase & Filmstrip (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Main Active Photo Frame (Clickable for Full Screen) */}
              <div
                onClick={() =>
                  openLightbox(
                    PHOTOGRAPHER_SHOWCASE_PHOTOS.map((p) => ({
                      src: p.src,
                      title: p.title,
                      subtitle: p.subtitle,
                      gear: p.gear,
                      year: p.year,
                    })),
                    activeShowcaseIdx
                  )
                }
                className="relative rounded-3xl overflow-hidden border border-[#1E293B] hover:border-[#38BDF8]/60 bg-[#04111F] shadow-2xl group aspect-[16/11] sm:aspect-[16/10] cursor-pointer"
              >
                <img
                  src={PHOTOGRAPHER_SHOWCASE_PHOTOS[activeShowcaseIdx].src}
                  alt={PHOTOGRAPHER_SHOWCASE_PHOTOS[activeShowcaseIdx].title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />

                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#030F1E] via-[#030F1E]/20 to-transparent pointer-events-none" />

                {/* Top Badges & Full Screen Button */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  <span className="px-3 py-1 rounded-full bg-[#030F1E]/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[10px] font-action-button uppercase font-semibold">
                    {PHOTOGRAPHER_SHOWCASE_PHOTOS[activeShowcaseIdx].year}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#030F1E]/80 backdrop-blur-md border border-[#1E293B] text-[#94A3B8] text-[10px] font-action-button">
                      {activeShowcaseIdx + 1} of {PHOTOGRAPHER_SHOWCASE_PHOTOS.length}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLightbox(
                          PHOTOGRAPHER_SHOWCASE_PHOTOS.map((p) => ({
                            src: p.src,
                            title: p.title,
                            subtitle: p.subtitle,
                            gear: p.gear,
                            year: p.year,
                          })),
                          activeShowcaseIdx
                        );
                      }}
                      className="btn-glass-plate btn-glass-plate-sky text-[10px] px-2.5 py-1 flex items-center gap-1.5"
                      title="Full-Screen View"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Full Screen</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Photo Metadata & Technical Notes */}
                <div className="absolute bottom-0 inset-x-0 p-6 space-y-2 pointer-events-none">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white font-presentation-body">
                    {PHOTOGRAPHER_SHOWCASE_PHOTOS[activeShowcaseIdx].title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#CBD5E1] font-presentation-body font-light max-w-xl line-clamp-2">
                    {PHOTOGRAPHER_SHOWCASE_PHOTOS[activeShowcaseIdx].subtitle}
                  </p>
                  <div className="pt-2 flex items-center gap-2 flex-wrap text-[10px] font-action-button text-emerald-400">
                    <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                      {PHOTOGRAPHER_SHOWCASE_PHOTOS[activeShowcaseIdx].gear}
                    </span>
                  </div>
                </div>

                {/* Prev / Next Controls */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveShowcaseIdx(
                      (prev) => (prev - 1 + PHOTOGRAPHER_SHOWCASE_PHOTOS.length) % PHOTOGRAPHER_SHOWCASE_PHOTOS.length
                    );
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 btn-glass-plate p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveShowcaseIdx(
                      (prev) => (prev + 1) % PHOTOGRAPHER_SHOWCASE_PHOTOS.length
                    );
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 btn-glass-plate p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Filmstrip Thumbnails Row */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PHOTOGRAPHER_SHOWCASE_PHOTOS.map((photo, idx) => {
                  const isActive = activeShowcaseIdx === idx;
                  return (
                    <button
                      key={photo.src}
                      type="button"
                      onClick={() => setActiveShowcaseIdx(idx)}
                      className={`relative aspect-square rounded-xl overflow-hidden border transition-all cursor-pointer ${
                        isActive
                          ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-95 shadow-md shadow-emerald-500/20'
                          : 'border-[#1E293B] opacity-60 hover:opacity-100 hover:border-[#334155]'
                      }`}
                    >
                      <img
                        src={photo.src}
                        alt={photo.title}
                        className="w-full h-full object-cover"
                      />
                      {isActive && (
                        <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE DIRECT BOOKING INTAKE WIDGET (ON LANDING PAGE) */}
      <section
        id="direct-booking-widget"
        className="py-16 px-4 sm:px-6 lg:px-12 bg-gradient-to-b from-[#030F1E] via-[#07172A] to-[#030F1E] border-b border-[#1E293B] scroll-mt-6"
      >
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#38BDF8]/10 border border-[#38BDF8]/30 text-[#38BDF8] text-xs font-mono-code uppercase font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>Direct Studio Reservation Desk</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Instant Session Booking & Bay Lock
            </h2>
            <p className="text-sm sm:text-base text-[#94A3B8] max-w-2xl mx-auto font-light">
              Select a photography package, choose your date and time slot, and instantly lock in your dedicated studio bay.
            </p>
          </div>

          <div className="surface-card rounded-3xl border border-[#1E293B] p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden">
            {widgetSuccessMessage ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white">Booking Recorded Successfully!</h3>
                <p className="text-sm text-[#94A3B8] max-w-md mx-auto">{widgetSuccessMessage}</p>
              </motion.div>
            ) : (
              <form onSubmit={handleDirectWidgetSubmit} className="space-y-8">
                {/* Step 1: Package Selection Selector */}
                <div className="space-y-3">
                  <label className="text-xs font-mono-code uppercase text-[#38BDF8] tracking-wider font-semibold flex items-center justify-between">
                    <span>1. Select Photography Package</span>
                    <span className="text-[#94A3B8] font-normal lowercase">{PHOTOGRAPHY_PACKAGES.length} packages available</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {PHOTOGRAPHY_PACKAGES.map((pkg) => {
                      const isSelected = selectedPackageId === pkg.id;
                      const catBadge =
                        pkg.category === 'PRE_BORN'
                          ? '1. Pre-born'
                          : pkg.category === 'PRE_WEDDING'
                          ? '2. Pre-wedding'
                          : pkg.category === 'FASHION'
                          ? '3. Fashion'
                          : pkg.category === 'SOLO'
                          ? '4. Solo'
                          : pkg.category || 'STUDIO';

                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedPackageId(pkg.id)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#38BDF8]/10 border-[#38BDF8] shadow-lg shadow-[#38BDF8]/10 ring-1 ring-[#38BDF8]'
                              : 'bg-[#030F1E]/60 border-[#1E293B] hover:border-[#334155]'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#38BDF8] text-[#030F1E] flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-mono-code uppercase px-1.5 py-0.5 rounded bg-[#38BDF8]/20 text-[#38BDF8] font-bold">
                                {catBadge}
                              </span>
                              <span className="text-[9px] font-mono-code uppercase text-[#94A3B8]">
                                {pkg.suiteAllocation}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white mt-1">{pkg.name}</h4>
                            <p className="text-xs text-[#94A3B8] line-clamp-2 mt-1">{pkg.description}</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-[#1E293B] flex items-baseline justify-between">
                            <span className="text-sm font-mono-code font-bold text-[#38BDF8]">
                              {pkg.price.toLocaleString()} MMK
                            </span>
                            <span className="text-[10px] font-mono-code text-[#64748B]">
                              Deposit: {pkg.deposit.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Date & Time Slots */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-[#1E293B]">
                  {/* Date Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono-code uppercase text-[#38BDF8] tracking-wider font-semibold">
                      2. Session Date
                    </label>
                    <div className="flex gap-2">
                      {['18 NOV 2026', '19 NOV 2026', '20 NOV 2026'].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setBookingDate(d)}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-mono-code border transition-all cursor-pointer ${
                            bookingDate === d
                              ? 'bg-[#38BDF8] text-[#030F1E] font-bold border-[#38BDF8]'
                              : 'bg-[#030F1E]/60 border-[#1E293B] text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Slot Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono-code uppercase text-[#38BDF8] tracking-wider font-semibold">
                      3. Preferred Time Slot
                    </label>
                    <select
                      value={bookingSlot}
                      onChange={(e) => setBookingSlot(e.target.value)}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-[#030F1E]/80 border border-[#334155] text-sm text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8] font-mono-code cursor-pointer"
                    >
                      {AVAILABLE_SLOTS.map((slot) => (
                        <option key={slot} value={slot} className="bg-[#07172A] text-white">
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Step 3: Client Identification & Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-[#1E293B]">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono-code text-[#CBD5E1]">
                      Client Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Daw Su Myat / Elena Rostova"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-[#030F1E]/70 border border-[#334155] text-sm text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono-code text-[#CBD5E1]">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      placeholder="+95 9 792 108 421"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-[#030F1E]/70 border border-[#334155] text-sm text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                    <label className="text-xs font-mono-code text-[#CBD5E1]">
                      Shoot Notes / Concepts
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2 outfits, product brand launch"
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#030F1E]/70 border border-[#334155] text-sm text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
                    />
                  </div>
                </div>

                {/* Summary & Submission Button */}
                <div className="pt-4 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#94A3B8]">Selected Suite:</span>
                      <span className="text-xs font-mono-code font-bold text-[#38BDF8]">
                        {currentSelectedPackage.suiteAllocation}
                      </span>
                      <span className="text-[#475569]">•</span>
                      <span className="text-xs text-[#94A3B8]">Total:</span>
                      <span className="text-sm font-mono-code font-bold text-white">
                        {currentSelectedPackage.price.toLocaleString()} MMK
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748B] font-mono-code">
                      Initial Deposit to Lock Bay: {currentSelectedPackage.deposit.toLocaleString()} MMK (50%)
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingWidget}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0369A1] text-[#030F1E] font-extrabold text-sm sm:text-base shadow-xl hover:shadow-[#38BDF8]/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingWidget ? (
                      <span>Reserving Studio Bay...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-[#030F1E]" />
                        <span>Reserve & Lock Studio Bay</span>
                        <ArrowRight className="w-4 h-4 text-[#030F1E]" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 3. CATEGORIZED PHOTOGRAPHY PACKAGES SECTION */}
      <section id="packages-section" className="py-20 px-4 sm:px-6 lg:px-12 border-b border-[#1E293B] scroll-mt-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <div className="text-xs font-mono-code text-[#38BDF8] uppercase tracking-wider font-semibold">
              Published Studio Rates & Categories
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Studio Photography Package Categories
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto text-sm font-light">
              Featuring seamless cyclorama stages, pre-rigged Profoto lighting systems, and live 4K tethered capture.
            </p>
          </div>

          {/* Package Category Filter Tabs */}
          <div className="flex justify-center items-center gap-2 flex-wrap">
            {PACKAGE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-mono-code transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#38BDF8] text-[#030F1E] font-bold shadow-lg shadow-[#38BDF8]/20'
                      : 'surface-card border border-[#1E293B] text-[#94A3B8] hover:text-white hover:border-[#334155]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Packages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-3xl surface-card border border-[#1E293B] hover:border-[#38BDF8]/60 transition-all duration-300 flex flex-col justify-between overflow-hidden relative group shadow-xl hover:shadow-2xl"
              >
                {/* Optional Hero Image Banner */}
                {pkg.heroImage && (
                  <div className="relative h-48 w-full overflow-hidden border-b border-[#1E293B]">
                    <img
                      src={pkg.heroImage}
                      alt={pkg.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07172A] via-[#07172A]/40 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="text-[10px] font-mono-code uppercase px-2.5 py-1 rounded-full bg-[#030F1E]/90 text-[#38BDF8] border border-[#38BDF8]/40 font-bold">
                        {pkg.category === 'PRE_BORN'
                          ? '1. Pre-born'
                          : pkg.category === 'PRE_WEDDING'
                          ? '2. Pre-wedding'
                          : pkg.category === 'FASHION'
                          ? '3. Fashion'
                          : pkg.category === 'SOLO'
                          ? '4. Solo'
                          : pkg.category === 'PORTFOLIO'
                          ? "5. Photographer's Portfolio"
                          : pkg.category || 'STUDIO'}
                      </span>
                    </div>
                    {pkg.recommended && (
                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-[#38BDF8] to-[#818CF8] text-[#030F1E] text-xs font-bold font-mono-code uppercase tracking-wider">
                        Most Popular
                      </div>
                    )}
                    <div className="absolute bottom-3 left-4">
                      <span className="text-xs font-mono-code text-[#CBD5E1]">
                        Assigned: <strong className="text-[#38BDF8]">{pkg.suiteAllocation}</strong>
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{pkg.name}</h3>
                      <p className="text-xs text-[#94A3B8] mt-1 font-mono-code">{pkg.suiteAllocation}</p>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-[#38BDF8] font-mono-code">
                        {pkg.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-[#94A3B8] font-mono-code uppercase">MMK / SESSION</span>
                    </div>

                    <p className="text-sm text-[#CBD5E1] font-light leading-relaxed">{pkg.description}</p>

                    <div className="space-y-2 pt-2 border-t border-[#1E293B]">
                      <div className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Package Inclusions</div>
                      {pkg.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-[#E2E8F0]">
                          <CheckCircle2 className="w-4 h-4 text-[#38BDF8] shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-[#1E293B] space-y-2">
                    <button
                      onClick={() => handleSelectPackageAndScroll(pkg)}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0369A1] text-[#030F1E] font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Calendar className="w-4 h-4 text-[#030F1E]" />
                      <span>Book This Package</span>
                      <ChevronRight className="w-4 h-4 text-[#030F1E]" />
                    </button>
                    <div className="text-center">
                      <span className="text-[11px] font-mono-code text-[#64748B]">
                        Deposit Required: {pkg.deposit.toLocaleString()} MMK (50%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. STUDIO BRAND STORY & ADVANCED CAPABILITIES */}
      <section className="py-20 px-4 sm:px-6 lg:px-12 border-b border-[#1E293B] surface-section">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="text-xs font-mono-code text-[#38BDF8] uppercase tracking-wider font-semibold">
              The Nocturne Atelier Standard
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              Engineered for Fashion, Commercial & Creative Art Direction
            </h2>
            <p className="text-[#94A3B8] leading-relaxed font-light">
              Located in Bahan Township, Yangon, {tenantConfig.displayName} provides commercial photographers, fashion brands, and agency creative teams with high-speed workflow infrastructure.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
                <span className="text-sm text-[#E2E8F0]">Automated turnstile Bay Pass & instant Telegram confirmation</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
                <span className="text-sm text-[#E2E8F0]">Gemini OCR instant deposit slip verification engine</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
                <span className="text-sm text-[#E2E8F0]">On-demand equipment inventory rental with instant bay delivery</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
                <span className="text-sm text-[#E2E8F0]">Full tethered 4K monitor support for client and director review</span>
              </div>
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden border border-[#334155] shadow-2xl group">
            <img
              src="/images/solo/solo_9.jpg"
              alt="Studio Bay Setup"
              className="w-full h-[440px] object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030F1E] via-transparent to-transparent opacity-85" />
            <div className="absolute bottom-6 left-6 right-6 p-5 rounded-2xl bg-[#07172A]/90 backdrop-blur-md border border-[#334155]">
              <div className="text-sm font-semibold text-white">BAY ALPHA-01 Commercial Infinity Stage</div>
              <div className="text-xs text-[#94A3B8] mt-1">25ft x 35ft Seamless Cyclorama • 14ft Ceiling • Profoto Pre-Rigged Racks</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. RENTAL EQUIPMENT PREVIEW */}
      <section className="py-20 px-4 sm:px-6 lg:px-12 border-b border-[#1E293B]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div className="space-y-2">
              <div className="text-xs font-mono-code text-[#38BDF8] uppercase tracking-wider font-semibold">
                Studio Gear Inventory
              </div>
              <h2 className="text-3xl font-bold text-white">Professional Lighting & Grip Rental</h2>
            </div>
            <button
              onClick={onOpenEquipment}
              className="px-5 py-2.5 rounded-xl border border-[#334155] hover:border-[#38BDF8] text-xs font-mono-code text-[#38BDF8] hover:bg-[#1E293B] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>View Full Inventory ({INITIAL_EQUIPMENT_LIST.length} Items)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {INITIAL_EQUIPMENT_LIST.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-6 rounded-2xl surface-card border border-[#1E293B] space-y-4 hover:border-[#334155] transition-all shadow-md"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono-code text-[#38BDF8] uppercase px-2.5 py-1 rounded bg-[#030F1E] border border-[#1E293B]">
                    {item.category}
                  </span>
                  <span className="text-xs font-mono-code font-bold text-slate-200">
                    {item.status.toUpperCase()}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white">{item.name}</h4>
                <p className="text-xs text-[#94A3B8] font-light leading-relaxed">{item.specs.join(' • ')}</p>
                <div className="text-[11px] text-[#64748B] font-mono-code">Specs: {item.specs[0]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. STUDIO AMENITIES */}
      <section className="py-16 px-4 sm:px-6 lg:px-12 border-b border-[#1E293B] surface-section">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-white">Dedicated Client Amenities</h3>
            <p className="text-xs text-[#94A3B8]">Comprehensive production amenities designed for creative teams and clients</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl surface-card border border-[#1E293B] text-center space-y-2">
              <Wifi className="w-6 h-6 text-[#38BDF8] mx-auto" />
              <div className="text-xs font-bold text-white">200Mbps Fiber Wi-Fi</div>
              <div className="text-[10px] text-[#94A3B8]">Fast raw cloud uploads</div>
            </div>
            <div className="p-4 rounded-xl surface-card border border-[#1E293B] text-center space-y-2">
              <Coffee className="w-6 h-6 text-[#38BDF8] mx-auto" />
              <div className="text-xs font-bold text-white">Artisan Coffee Bar</div>
              <div className="text-[10px] text-[#94A3B8]">Fresh espresso & refreshments</div>
            </div>
            <div className="p-4 rounded-xl surface-card border border-[#1E293B] text-center space-y-2">
              <Car className="w-6 h-6 text-[#38BDF8] mx-auto" />
              <div className="text-xs font-bold text-white">Private Parking</div>
              <div className="text-[10px] text-[#94A3B8]">Complimentary studio bays</div>
            </div>
            <div className="p-4 rounded-xl surface-card border border-[#1E293B] text-center space-y-2">
              <Shield className="w-6 h-6 text-[#38BDF8] mx-auto" />
              <div className="text-xs font-bold text-white">Private Vanity Suite</div>
              <div className="text-[10px] text-[#94A3B8]">Steamers & styling counters</div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. GALLERY / PORTFOLIO SHOWCASE */}
      <section id="gallery-showcase" className="py-20 px-4 sm:px-6 lg:px-12 border-b border-[#1E293B] scroll-mt-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <div className="text-xs font-mono-code text-[#38BDF8] uppercase tracking-wider font-semibold">
              Portfolio & Work Showcase
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Captured at {tenantConfig.displayName}</h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex justify-center items-center gap-2 flex-wrap">
            {galleryCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveGalleryTab(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-mono-code transition-all cursor-pointer ${
                  activeGalleryTab === cat.id
                    ? 'bg-[#38BDF8] text-[#030F1E] font-bold shadow-md'
                    : 'surface-card border border-[#1E293B] text-[#94A3B8] hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {filteredGallery.map((item, idx) => (
              <div
                key={item.id}
                onClick={() =>
                  openLightbox(
                    filteredGallery.map((g) => ({
                      src: g.image,
                      title: g.title,
                      bay: g.bay,
                      year: g.category,
                    })),
                    idx
                  )
                }
                className="group relative rounded-2xl overflow-hidden border border-[#1E293B] hover:border-[#38BDF8]/60 surface-card shadow-lg cursor-pointer"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030F1E] via-transparent to-transparent opacity-90" />
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="btn-glass-plate btn-glass-plate-sky p-2 rounded-full text-xs">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 space-y-1">
                  <span className="text-[9px] font-action-button text-[#38BDF8] uppercase tracking-wider block">
                    {item.bay}
                  </span>
                  <div className="text-sm font-semibold text-white font-presentation-body">{item.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. LOCATION & CONTACT FOOTER CALLOUT */}
      <section className="py-16 px-4 sm:px-6 lg:px-12 surface-section">
        <div className="max-w-5xl mx-auto rounded-3xl surface-card border border-[#334155] p-8 sm:p-12 grid grid-cols-1 md:grid-cols-3 gap-8 shadow-2xl">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#38BDF8]">
              <MapPin className="w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-wider font-action-button">Studio Location</h4>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed font-presentation-body">
              {tenantConfig.address}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#38BDF8]">
              <Phone className="w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-wider font-action-button">Direct Contact</h4>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed font-presentation-body">
              Phone: {tenantConfig.phone}<br />
              Telegram: {tenantConfig.telegramContact}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#38BDF8]">
              <Clock className="w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-wider font-action-button">Operating Hours</h4>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed font-presentation-body">
              09:00 - 21:00 MMT Daily<br />
              Open 7 Days a Week
            </p>
          </div>
        </div>
      </section>

      {/* INTERACTIVE FLOOR PLAN MODAL */}
      <AnimatePresence>
        {isFloorPlanOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-[#030F1E]/95 backdrop-blur-md p-4 sm:p-6 flex justify-center items-center">
            <div className="surface-card border border-[#334155] rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 relative shadow-2xl">
              <button
                onClick={() => setIsFloorPlanOpen(false)}
                className="absolute top-4 right-4 btn-glass-plate p-2"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white font-presentation-body">Studio Architectural Floor Plan</h3>
                <p className="text-xs text-[#94A3B8] font-action-button">3 Acoustic Stages & Tethered Control Stations</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl border border-[#38BDF8]/40 surface-card space-y-2">
                  <div className="text-xs font-action-button text-[#38BDF8] font-bold">BAY ALPHA-01</div>
                  <div className="text-sm font-semibold text-slate-200 font-presentation-body">Commercial Stage</div>
                  <div className="text-xs text-[#94A3B8] font-presentation-body">25ft x 35ft Cyclorama • 14ft Ceiling • Overhead Rig</div>
                </div>
                <div className="p-4 rounded-2xl border border-[#334155] surface-card space-y-2">
                  <div className="text-xs font-action-button text-[#818CF8] font-bold">BAY BETA-02</div>
                  <div className="text-sm font-semibold text-slate-200 font-presentation-body">Fashion & Portrait</div>
                  <div className="text-xs text-[#94A3B8] font-presentation-body">20ft x 25ft Stage • Seamless Wall • Prep Counter</div>
                </div>
                <div className="p-4 rounded-2xl border border-[#334155] surface-card space-y-2">
                  <div className="text-xs font-action-button text-[#C084FC] font-bold">BAY GAMMA-03</div>
                  <div className="text-sm font-semibold text-slate-200 font-presentation-body">Creative Direction</div>
                  <div className="text-xs text-[#94A3B8] font-presentation-body">18ft x 22ft Stage • Blackout Curtains • Audio Rig</div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#1E293B]">
                <button
                  onClick={() => {
                    setIsFloorPlanOpen(false);
                    onEnterBooking();
                  }}
                  className="btn-glass-plate btn-glass-plate-primary font-action-button text-xs py-3 px-6"
                >
                  Proceed to Booking
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. NEAR FULL-SCREEN PORTFOLIO & SHOWCASE LIGHTBOX MODAL */}
      {lightboxState.isOpen && typeof document !== 'undefined' && createPortal(
        <AnimatePresence mode="wait">
          <motion.div
            key="lightbox-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeLightbox}
            className="fixed inset-0 z-[999999] bg-[#020712]/98 backdrop-blur-3xl flex flex-col justify-between p-4 sm:p-6 md:p-8 select-none overflow-hidden h-screen w-screen top-0 left-0"
          >
            {/* Top Control Header */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between z-30 max-w-7xl mx-auto w-full pt-2 px-2"
            >
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1.5 rounded-full bg-[#38BDF8]/20 border border-[#38BDF8]/50 text-[#38BDF8] text-xs font-action-button shadow-lg font-bold">
                  FULL-SCREEN VIEW
                </span>
                {lightboxState.images[lightboxState.currentIndex]?.year && (
                  <span className="text-xs text-[#CBD5E1] font-action-button hidden sm:inline-block">
                    • {lightboxState.images[lightboxState.currentIndex].year}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs font-action-button text-[#94A3B8] font-bold">
                  {lightboxState.currentIndex + 1} / {lightboxState.images.length}
                </span>

                {/* Prominent High-Visibility Close Button */}
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="btn-glass-plate btn-glass-plate-sky font-action-button text-xs px-4 py-2 flex items-center gap-2 border-2 border-[#38BDF8] shadow-2xl hover:scale-105 transition-all cursor-pointer font-bold text-white"
                  aria-label="Close lightbox"
                >
                  <span>Close</span>
                  <X className="w-4 h-4 text-white" />
                  <span className="text-[10px] text-[#94A3B8] font-normal">(ESC)</span>
                </button>
              </div>
            </div>

            {/* Center Image Container with Navigation Arrows */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative flex-1 flex items-center justify-center my-auto py-4 overflow-hidden w-full h-full max-h-[78vh]"
            >
              {/* Prev Arrow */}
              {lightboxState.images.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxState((prev) => ({
                      ...prev,
                      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length,
                    }));
                  }}
                  className="absolute left-3 sm:left-8 z-40 btn-glass-plate btn-glass-plate-sky p-3.5 sm:p-4 rounded-full shadow-2xl hover:scale-110 cursor-pointer border-2 border-[#38BDF8]/60"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
              )}

              {/* Main Full-Screen Photographic Display */}
              <motion.img
                key={lightboxState.currentIndex}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                src={lightboxState.images[lightboxState.currentIndex]?.src}
                alt={lightboxState.images[lightboxState.currentIndex]?.title || 'Full screen portfolio photo'}
                className="max-h-[74vh] sm:max-h-[78vh] max-w-[92vw] sm:max-w-[85vw] object-contain rounded-2xl shadow-2xl border border-white/20 my-auto block"
              />

              {/* Next Arrow */}
              {lightboxState.images.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxState((prev) => ({
                      ...prev,
                      currentIndex: (prev.currentIndex + 1) % prev.images.length,
                    }));
                  }}
                  className="absolute right-3 sm:right-8 z-40 btn-glass-plate btn-glass-plate-sky p-3.5 sm:p-4 rounded-full shadow-2xl hover:scale-110 cursor-pointer border-2 border-[#38BDF8]/60"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              )}
            </div>

            {/* Bottom Metadata Bar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl mx-auto w-full text-center space-y-1.5 z-30 p-3.5 sm:p-4 rounded-2xl bg-[#04111F]/95 backdrop-blur-md border border-white/20 shadow-2xl shrink-0"
            >
              <h3 className="text-base sm:text-lg font-extrabold text-white font-presentation-body">
                {lightboxState.images[lightboxState.currentIndex]?.title}
              </h3>
              {lightboxState.images[lightboxState.currentIndex]?.subtitle && (
                <p className="text-xs text-[#CBD5E1] font-presentation-body font-light max-w-2xl mx-auto line-clamp-2">
                  {lightboxState.images[lightboxState.currentIndex].subtitle}
                </p>
              )}
              {lightboxState.images[lightboxState.currentIndex]?.gear && (
                <div className="text-[11px] font-action-button text-[#38BDF8] pt-0.5">
                  {lightboxState.images[lightboxState.currentIndex].gear}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

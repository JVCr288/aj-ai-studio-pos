import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ScreenStep,
  BookingState,
  PaymentGateway,
  ThemePalette,
  AtmosphereTheme,
  WorkspaceView,
} from './types';
import { PHOTOGRAPHY_PACKAGES } from './data/mockData';
import { getInitialAtmosphere, isAtmosphereTheme, ATMOSPHERE_OPTIONS } from './data/atmosphereData';
import { getInitialWorkspaceView } from './utils/workspaceView';
import { Navbar } from './components/Navbar';
import { BookingScreen } from './components/BookingScreen';
import { PaymentModal } from './components/PaymentModal';
import { VerificationScreen } from './components/VerificationScreen';
import { DigitalPassScreen } from './components/DigitalPassScreen';
import { ArchiveVaultScreen } from './components/ArchiveVaultScreen';
import { EquipmentInventoryScreen } from './components/EquipmentInventoryScreen';
import { StudioOnboardingScreen } from './components/StudioOnboardingScreen';
import { StudioOnboardingReviewConsole } from './components/StudioOnboardingReviewConsole';
import { StudioOnboardingMapperPreviewConsole } from './components/StudioOnboardingMapperPreviewConsole';
import { StudioLandingPortal } from './components/StudioLandingPortal';
import { StandaloneOwnerPortal } from './components/StandaloneOwnerPortal';
import { Footer } from './components/Footer';
import { SettingsModal } from './components/SettingsModal';
import { StudioAdminBookingPanel } from './components/StudioAdminBookingPanel';
import { StudioPosDesk } from './components/StudioPosDesk';
import { submitCustomerBookingToServer } from './services/adminBookingClientService';

const pageVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    y: direction >= 0 ? 14 : -14,
    scale: 0.996,
    filter: 'blur(3px)',
  }),
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction >= 0 ? -14 : 14,
    scale: 0.996,
    filter: 'blur(3px)',
  }),
};

export default function App() {
  const [setupToken, setSetupToken] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      if (pathname.startsWith('/setup/')) {
        return pathname.replace('/setup/', '').trim();
      }
      return searchParams.get('setupToken') || searchParams.get('token') || undefined;
    }
    return undefined;
  });

  const [isStandaloneOwnerRoute, setIsStandaloneOwnerRoute] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      return pathname.startsWith('/setup') || searchParams.has('setupToken') || searchParams.has('setup');
    }
    return false;
  });

  const [isAdminBookingRoute, setIsAdminBookingRoute] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      return pathname.startsWith('/admin') || searchParams.has('admin');
    }
    return false;
  });

  const [isPosDeskOpen, setIsPosDeskOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      return pathname.startsWith('/pos') || searchParams.has('pos');
    }
    return false;
  });

  const [currentScreen, setCurrentScreen] = useState<ScreenStep>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('step') === 'booking' || searchParams.get('direct') === 'booking' || pathname === '/booking') {
        return 1;
      }
      const stepParam = searchParams.get('step');
      if (stepParam) {
        const parsed = parseInt(stepParam, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 6) {
          return parsed as ScreenStep;
        }
      }
    }
    return 0; // Deterministic default for root "/" with no customer-workflow query
  });

  const [direction, setDirection] = useState<number>(1);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      return sp.get('step') === '2' || sp.has('payment');
    }
    return false;
  });
  const [atmosphere, setAtmosphere] = useState<AtmosphereTheme>(() => getInitialAtmosphere());
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(() =>
    getInitialWorkspaceView()
  );
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isOnboardingPortalOpen, setIsOnboardingPortalOpen] = useState(false);
  const [isDeveloperReviewOpen, setIsDeveloperReviewOpen] = useState(false);
  const [isMapperPreviewOpen, setIsMapperPreviewOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePalette>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('akk_theme_palette');
      if (saved === 'neon' || saved === 'midnight') return saved;
    }
    return 'midnight';
  });

  useEffect(() => {
    const syncRouteState = () => {
      if (typeof window === 'undefined') return;
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);

      if (pathname.startsWith('/pos') || searchParams.has('pos')) {
        setIsPosDeskOpen(true);
        setIsStandaloneOwnerRoute(false);
        setIsAdminBookingRoute(false);
        return;
      }

      setIsPosDeskOpen(false);

      if (pathname.startsWith('/setup') || searchParams.has('setupToken') || searchParams.has('setup')) {
        setIsStandaloneOwnerRoute(true);
        setIsAdminBookingRoute(false);
        return;
      }

      if (pathname.startsWith('/admin') || searchParams.has('admin')) {
        setIsAdminBookingRoute(true);
        setIsStandaloneOwnerRoute(false);
        return;
      }

      setIsStandaloneOwnerRoute(false);
      setIsAdminBookingRoute(false);
      if (searchParams.get('step') === 'booking' || searchParams.get('direct') === 'booking' || pathname === '/booking') {
        setCurrentScreen(1);
      } else {
        const stepParam = searchParams.get('step');
        if (stepParam) {
          const parsed = parseInt(stepParam, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) {
            setCurrentScreen(parsed as ScreenStep);
            return;
          }
        }
        setCurrentScreen(0);
      }
    };

    window.addEventListener('popstate', syncRouteState);
    return () => window.removeEventListener('popstate', syncRouteState);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('akk_theme_palette', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-atmosphere', atmosphere);
    document.body.setAttribute('data-atmosphere', atmosphere);
  }, [atmosphere]);

  useEffect(() => {
    document.documentElement.setAttribute('data-workspace-view', workspaceView);
    document.body.setAttribute('data-workspace-view', workspaceView);
  }, [workspaceView]);

  const handleSelectWorkspaceView = (newView: WorkspaceView) => {
    const validView: WorkspaceView = newView === 'full' ? 'full' : 'compact';
    setWorkspaceView(validView);
    try {
      localStorage.setItem('nocturne-workspace-view', validView);
    } catch (e) {
      // ignore
    }
  };

  const handleToggleWorkspaceView = () => {
    handleSelectWorkspaceView(workspaceView === 'compact' ? 'full' : 'compact');
  };

  const handleSelectAtmosphere = (newAtmosphere: AtmosphereTheme) => {
    if (!isAtmosphereTheme(newAtmosphere)) return;
    setAtmosphere(newAtmosphere);
    try {
      localStorage.setItem('nocturne-atmosphere', newAtmosphere);
    } catch (e) {
      // ignore
    }
  };

  const initialBookingState: BookingState = {
    packageId: PHOTOGRAPHY_PACKAGES[0].id,
    selectedPackage: PHOTOGRAPHY_PACKAGES[0],
    dateStr: '18 NOV 2026',
    monthStr: 'NOVEMBER 2026',
    timeSlot: '11:00 AM',
    guestName: 'Elena Rostova',
    clientPhone: '+95 9 792 108 421',
    telegramHandle: '@elena_rostova',
    gateway: 'KBZPay',
    manifestId: '#NOCT-2026-09',
    token: '#NOCT-2026-904X',
    turnstileCode: 'AKK-BAY-01-PASS',
    depositPaid: false,
    depositAmount: 105000,
    totalAmount: 210000,
    bayAllocation: 'BAY ALPHA-01',
    uploadedSlipName: 'KBZPay_Slip_TRX88219.png',
    uploadedSlipSize: '2.1 MB',
    briefingNotes: 'High-key fashion setup with seamless white backdrop; tethered capture monitor on Bay Alpha-01',
    telegramConnected: true,
    telegramAutoNotify: true,
  };

  const [bookingState, setBookingState] = useState<BookingState>(initialBookingState);

  const handleUpdateBooking = (updates: Partial<BookingState>) => {
    setBookingState((prev) => ({ ...prev, ...updates }));
  };

  const navigateToScreen = (screen: ScreenStep) => {
    setDirection(screen >= currentScreen ? 1 : -1);
    if (screen === 2) {
      setIsPaymentModalOpen(true);
      setCurrentScreen(2);
    } else {
      setIsPaymentModalOpen(false);
      setCurrentScreen(screen);
    }

    if (typeof window !== 'undefined') {
      if (screen === 0) {
        window.history.pushState({}, '', '/');
      } else if (screen === 1) {
        window.history.pushState({}, '', '/?step=booking');
      } else {
        window.history.pushState({}, '', `/?step=${screen}`);
      }
    }
  };

  const handleSelectScreen = (screen: ScreenStep) => {
    navigateToScreen(screen);
  };

  const handleReset = () => {
    setDirection(-1);
    setBookingState({
      ...initialBookingState,
      uploadedSlipName: undefined,
      uploadedSlipSize: undefined,
    });
    setIsPaymentModalOpen(false);
    navigateToScreen(0);
  };

  // ---------------------------------------------------------------------------
  // ROUTE BRANCH A: Standalone Studio Owner Intake Portal (/setup or /setup/:token)
  // MAIN_STUDIO_UI_HIDDEN_FROM_OWNER=YES
  // ---------------------------------------------------------------------------
  if (isStandaloneOwnerRoute) {
    return (
      <StandaloneOwnerPortal
        rawToken={setupToken}
        onExitStandalone={() => {
          setIsStandaloneOwnerRoute(false);
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/');
          }
        }}
      />
    );
  }

  return (
    <div
      data-theme={theme}
      data-atmosphere={atmosphere}
      className="min-h-screen surface-page text-[#F1F5F9] flex flex-col justify-between selection:bg-[#38BDF8] selection:text-[#071423] app-root transition-colors duration-300 font-sans relative"
    >
      {/* 5-Atmosphere Background Shell (Fixed with 700ms cross-fade between layers) */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
        {ATMOSPHERE_OPTIONS.map((opt) => {
          const isActive = atmosphere === opt.id;
          return (
            <div
              key={opt.id}
              className={`absolute inset-0 atmosphere-layer-${opt.id} transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              style={{ willChange: 'opacity' }}
            />
          );
        })}
      </div>
      {/* Top Persistent Navigation Bar */}
      <Navbar
        currentScreen={isAdminBookingRoute ? 1 : (isPaymentModalOpen ? 2 : currentScreen)}
        onSelectScreen={(screen) => {
          setIsAdminBookingRoute(false);
          handleSelectScreen(screen);
        }}
        onReset={handleReset}
        manifestId={bookingState.manifestId}
        workspaceView={workspaceView}
        onToggleWorkspaceView={handleToggleWorkspaceView}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenAdminBookings={() => {
          setIsAdminBookingRoute(true);
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/admin/bookings');
          }
        }}
        onOpenPosDesk={() => {
          setIsPosDeskOpen(true);
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/?pos=true');
          }
        }}
      />

      {/* Main Screen Body View with Motion Page Transitions */}
      <main className="flex-1 flex flex-col w-full relative">
        {isAdminBookingRoute ? (
          <StudioAdminBookingPanel
            onClose={() => {
              setIsAdminBookingRoute(false);
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/');
              }
            }}
          />
        ) : (
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={currentScreen === 2 ? 'screen-1-booking' : `screen-${currentScreen}`}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.28,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex-1 flex flex-col w-full"
            >
            {/* Screen 0: Public Studio Landing Portal */}
            {currentScreen === 0 && (
              <StudioLandingPortal
                onEnterBooking={(prefill) => {
                  if (prefill) {
                    handleUpdateBooking(prefill);
                  }
                  navigateToScreen(1);
                }}
                onOpenEquipment={() => navigateToScreen(6)}
                atmosphere={atmosphere}
                onSelectAtmosphere={handleSelectAtmosphere}
              />
            )}

            {/* Screen 1: Booking & Package Selection */}
            {currentScreen === 1 && (
              <BookingScreen
                bookingState={bookingState}
                onUpdateBooking={handleUpdateBooking}
                workspaceView={workspaceView}
                onOpenPaymentModal={() => {
                  setIsPaymentModalOpen(true);
                  setCurrentScreen(2);
                }}
                onProceedToVerification={async () => {
                  const slipName = bookingState.uploadedSlipName || `${bookingState.gateway}_Slip_TRX88219.png`;
                  const slipSize = bookingState.uploadedSlipSize || '2.1 MB';
                  const updatedPayload = {
                    ...bookingState,
                    uploadedSlipName: slipName,
                    uploadedSlipSize: slipSize,
                  };
                  handleUpdateBooking({
                    uploadedSlipName: slipName,
                    uploadedSlipSize: slipSize,
                  });
                  try {
                    const persisted = await submitCustomerBookingToServer(updatedPayload);
                    if (persisted?.bookingReference) {
                      handleUpdateBooking({ manifestId: persisted.bookingReference });
                    }
                    navigateToScreen(3);
                  } catch (err: any) {
                    console.warn('Booking persistence failed, falling back gracefully:', err);
                    navigateToScreen(3);
                  }
                }}
                onOpenEquipment={() => navigateToScreen(6)}
              />
            )}

            {/* Screen 2 Standalone or Modal */}
            {currentScreen === 2 && (
              <>
                <BookingScreen
                  bookingState={bookingState}
                  onUpdateBooking={handleUpdateBooking}
                  workspaceView={workspaceView}
                  onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
                  onProceedToVerification={() => navigateToScreen(3)}
                  onOpenEquipment={() => navigateToScreen(6)}
                />
                <PaymentModal
                  bookingState={bookingState}
                  onClose={() => {
                    setIsPaymentModalOpen(false);
                    navigateToScreen(1);
                  }}
                  onCompleteTransfer={async () => {
                    const slipName = bookingState.uploadedSlipName || `${bookingState.gateway}_Slip_TRX88219.png`;
                    const slipSize = bookingState.uploadedSlipSize || '2.1 MB';
                    const updatedPayload = {
                      ...bookingState,
                      uploadedSlipName: slipName,
                      uploadedSlipSize: slipSize,
                      depositPaid: false,
                    };
                    handleUpdateBooking({
                      uploadedSlipName: slipName,
                      uploadedSlipSize: slipSize,
                      depositPaid: false,
                    });
                    try {
                      const persisted = await submitCustomerBookingToServer(updatedPayload);
                      if (persisted?.bookingReference) {
                        handleUpdateBooking({ manifestId: persisted.bookingReference });
                      }
                      setIsPaymentModalOpen(false);
                      navigateToScreen(3);
                    } catch (err: any) {
                      console.warn('Booking transfer persistence failed, falling back gracefully:', err);
                      setIsPaymentModalOpen(false);
                      navigateToScreen(3);
                    }
                  }}
                  onSelectGateway={(gw: PaymentGateway) =>
                    handleUpdateBooking({ gateway: gw })
                  }
                />
              </>
            )}

            {/* Screen 3: Slip Cryptographic Verification */}
            {currentScreen === 3 && (
              <VerificationScreen
                bookingState={bookingState}
                onVerificationComplete={() => navigateToScreen(4)}
                onBackToBooking={() => navigateToScreen(1)}
                workspaceView={workspaceView}
              />
            )}

            {/* Screen 4: Studio Digital Bay Pass */}
            {currentScreen === 4 && (
              <DigitalPassScreen
                bookingState={bookingState}
                onProceedToVault={() => navigateToScreen(5)}
              />
            )}

            {/* Screen 5: Client Deliverables Archive Vault */}
            {currentScreen === 5 && (
              <ArchiveVaultScreen
                bookingState={bookingState}
                workspaceView={workspaceView}
              />
            )}

            {/* Screen 6: Studio Equipment & Gear Inventory */}
            {currentScreen === 6 && (
              <EquipmentInventoryScreen
                bookingState={bookingState}
                onNavigateToBooking={() => navigateToScreen(1)}
                workspaceView={workspaceView}
              />
            )}
          </motion.div>
        </AnimatePresence>
        )}
      </main>

      {/* Persistent Global Studio Footer with Atmosphere Preset Selector */}
      <Footer
        atmosphere={atmosphere}
        onSelectAtmosphere={handleSelectAtmosphere}
        currentScreen={currentScreen}
        manifestId={bookingState.manifestId}
        clientPhone={bookingState.clientPhone}
        workspaceView={workspaceView}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Studio Workstation Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        workspaceView={workspaceView}
        onSelectWorkspaceView={handleSelectWorkspaceView}
        atmosphere={atmosphere}
        onSelectAtmosphere={handleSelectAtmosphere}
        onLaunchOnboardingSetup={() => setIsOnboardingPortalOpen(true)}
        onLaunchDeveloperReview={() => setIsDeveloperReviewOpen(true)}
        onLaunchMapperPreview={() => setIsMapperPreviewOpen(true)}
        onLaunchAdminBookings={() => {
          setIsAdminBookingRoute(true);
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/admin/bookings');
          }
        }}
        onLaunchPosDesk={() => {
          setIsPosDeskOpen(true);
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/?pos=true');
          }
        }}
      />

      {/* Studio POS Desk Terminal Component */}
      {isPosDeskOpen && (
        <StudioPosDesk
          bookingState={bookingState}
          onCloseDesk={() => {
            setIsPosDeskOpen(false);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }}
          workspaceView={workspaceView}
          onToggleWorkspaceView={handleToggleWorkspaceView}
          onSyncBookingToGlobal={(updated) => handleUpdateBooking(updated)}
        />
      )}

      {/* Studio Onboarding Setup Portal (Controlled Development Entry Point) */}
      {isOnboardingPortalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#030F1E]/95 backdrop-blur-md p-4 sm:p-6 flex justify-center items-start pt-12">
          <StudioOnboardingScreen
            onClosePortal={() => setIsOnboardingPortalOpen(false)}
          />
        </div>
      )}

      {/* Developer Review Console (Controlled Development / Admin Entry Point) */}
      {isDeveloperReviewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#030F1E]/95 backdrop-blur-md p-4 sm:p-6 flex justify-center items-start pt-12">
          <StudioOnboardingReviewConsole
            onClose={() => setIsDeveloperReviewOpen(false)}
          />
        </div>
      )}

      {/* Integration & Mapper Preview Console (Controlled Development / Admin Entry Point) */}
      {isMapperPreviewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#030F1E]/95 backdrop-blur-md p-4 sm:p-6 flex justify-center items-start pt-12">
          <StudioOnboardingMapperPreviewConsole
            onClose={() => setIsMapperPreviewOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

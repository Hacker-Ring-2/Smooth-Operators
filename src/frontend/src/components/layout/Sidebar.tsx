'use client';

import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronUp,
  Ellipsis,
  EllipsisVertical,
  PanelRightClose,
  Plus,
  Settings,
} from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MobileHeader from './MobileHeader';
import ApiServices from '@/services/ApiServices';
import { useAuthStore, useMessageStore } from '@/store/useZustandStore';
import { AccountDropdown, AccountDropdownHandle } from './components/MyAccountDropdown';
import { LogoutDialog } from './components/LogoutDialog';
import { HiOutlineSearch } from 'react-icons/hi';
import { SearchThreadsDialog } from './components/ThreadSearchDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { toast } from 'sonner';
import LoaderComponent from '../Loader';
import { handlePaginationData } from '@/utils/pagination';
import { handleDeleteSession } from '@/utils/session';
import { useSessionHistoryStore } from '@/store/useSessionHistory';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DeleteConfirmationModal from '../Modals/deleteConfirmation';

// Types
interface ISidebarImages {
  id: number;
  type: string;
  src: string;
  activeSrc: string;
}

interface TimelineItem {
  title: string;
  created_at: string;
  id: string;
}

interface TimelineGroup {
  timeline: string;
  data: TimelineItem[];
}

export type SessionHistoryData = TimelineGroup[];

interface SidebarContentProps {
  isSidebarOpen: boolean;
  handleOpenSidebar: () => void;
  sessionId: string | null;
  userName: string | null;
  router: any;
  isMobile?: boolean;
  toggleMobileSidebar?: () => void;
  setIsMobileSidebarOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  isChartInsightChatRoute?: boolean;
}

// ApiService response type
interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

// Animation variants
export const sidebarOpenVariants: Variants = {
  hidden: {
    x: '-100%',
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  visible: {
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
      when: 'beforeChildren', // container animates first
      staggerChildren: 0.1, // delay children fade-in
    },
  },
};

export const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -15,
    transition: {
      type: 'tween',
      ease: 'easeIn',
      duration: 0.15,
    },
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      duration: 0.2,
    },
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: {
      type: 'tween',
      ease: 'easeOut',
      duration: 0.1,
    },
  },
};

export const sidebarVariants: Variants = {
  hidden: {
    x: '-100%',
    boxShadow: '0px 0px 0px rgba(0, 0, 0, 0)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 40,
      when: 'afterChildren',
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
  visible: {
    x: 0,
    boxShadow: '5px 0px 25px rgba(0, 0, 0, 0.1)',
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 30,
      when: 'beforeChildren',
      staggerChildren: 0.08,
    },
  },
};

// Shared sidebar content component
const SidebarContent: React.FC<SidebarContentProps> = ({
  isSidebarOpen,
  handleOpenSidebar,
  sessionId,
  userName,
  router,
  isMobile = false,
  toggleMobileSidebar = () => {},
  setIsMobileSidebarOpen = () => {},
  isChartInsightChatRoute,
}) => {
  const images: ISidebarImages[] = [
    {
      id: 1,
      src: '/icons/search.svg',
      type: 'icon',
      activeSrc: '/icons/search.svg',
    },
  ];
  const searchParams = useSearchParams();

  const dropdownRef = useRef<AccountDropdownHandle>(null);
  const [open, setOpen] = useState(false);
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const setMessage = useMessageStore((state) => state.setMessage);
  const sessionHistoryData = useSessionHistoryStore((s) => s.sessionHistoryData);
  const setSessionHistoryData = useSessionHistoryStore((s) => s.setSessionHistoryData);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(true);
  const hasFetchedRef = useRef(false);
  const LIMIT = 25;

  console.log(sessionHistoryData, 'sses');

  const getSessionHistoryHandler = async (
    abortController?: AbortController,
    page: number = 1,
    limit: number = LIMIT
  ): Promise<void> => {
    if (!isLastPage) return;
    setHistoryLoading(true);
    console.log('fetching', page, LIMIT);

    hasFetchedRef.current = true;

    try {
      const response = await ApiServices.getSessionHistory(page, limit, undefined);

      setIsLastPage(response.data.has_more);

      setSessionHistoryData((prev) => {
        return handlePaginationData(response, prev);
      });
    } catch (error) {
      if (abortController && abortController.signal.aborted) {
        console.log(' Session history fetch aborted');
      } else {
        console.error(' Error fetching session history:', error);
        setSessionHistoryData([]);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteSessionId = (sessionId: string) => {
    setSessionHistoryData((prev) => {
      return prev.map((sessionHistory) => ({
        timeline: sessionHistory.timeline,
        data: sessionHistory.data.filter((timeline) => timeline.id !== sessionId),
      }));
    });
  };

  useEffect(() => {
    if (isSidebarOpen) {
      const abortController = new AbortController();

      getSessionHistoryHandler(abortController, page, LIMIT);
      return () => {
        abortController.abort();
      };
    }
  }, [isSidebarOpen]);

  const handlePagination = () => {
    getSessionHistoryHandler(undefined, page + 1, LIMIT);
    setPage(page + 1);
  };

  useEffect(() => {
    let observer: IntersectionObserver;

    requestAnimationFrame(() => {
      if (!scrollRef.current || !bottomRef.current) return;

      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            console.log('reached bottom');

            handlePagination();
          }
        },
        {
          root: scrollRef.current,
          threshold: 1.0,
        }
      );

      observer.observe(bottomRef.current);
    });

    return () => observer?.disconnect();
  }, [isSidebarOpen, sessionHistoryData]);

  type MenuItem = {
    id: string;
    label: string;
    src: string;
    onClick: () => void;
  };

  const accountMenuItems: MenuItem[] = [
    {
      id: 'account',
      label: 'My Account',
      src: '/icons/user_icon.svg',
      onClick: () => router.push('/my-account'),
    },
    {
      id: 'personalization',
      label: 'Personalization',
      src: '/icons/personalization2.svg',
      onClick: () => router.push('/personalization'),
    },
    {
      id: 'technical-analysis',
      label: 'Technical Analysis',
      src: '/icons/technical_analysis.svg',
      onClick: () => router.push('/technical-analysis'),
    },
    // {
    //   id: "integrations",
    //   label: "Integrations",
    //   src: "/icons/integrations.svg",
    //   onClick: () => console.log("Integrations clicked"),
    // },
    // {
    //   id: "enterprise",
    //   label: "Enterprise Solution",
    //   src: "/icons/enterprise.svg",
    //   onClick: () => console.log("Enterprise Solution clicked"),
    // },
    // {
    //   id: "upgrade",
    //   label: "Upgrade Plan",
    //   src: "/icons/upgrade.svg",
    //   onClick: () => console.log("Upgrade Plan clicked"),
    // },
    {
      id: 'logout',
      label: 'LogOut',
      src: '',
      onClick: () => setOpen(true),
    },
  ];

  const handleSessionTiltleClick = (sessionId: string): void => {
    setMessage('');
    router.push(`/chat?search=${sessionId}`);
    toggleMobileSidebar();
  };

  const handleOptionClick = async (sessionId: string) => {
    try {
      const sessionIdFromParams = searchParams.get('search');
      setOpenDeleteModal(false);
      await handleDeleteSession(sessionId);
      if (sessionIdFromParams === sessionId) {
        router.push('/');
      }
      handleDeleteSessionId(sessionId);
      toast.success('Session deleted successfully.');
    } catch (error) {
      console.log('error in deleting session', error);
    }
  };
  // Expanded sidebar content
  if (isSidebarOpen || isMobile) {
    return (
      <>
        <motion.div
          key="expanded"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={isMobile ? itemVariants : sidebarOpenVariants}
          className="h-full w-full flex flex-col py-10 bg-[#102822]"
        >
          {/* Header */}
          <div className="pb-6 px-6">
            <div className="flex items-center justify-between">
              <div onClick={() => router.push('/')} className="">
                <Image
                  src="/images/ia_logo_with_name.svg"
                  width={176}
                  height={30}
                  alt="logo"
                  // layout="responsive"
                  className="sm:h-[1.875rem] h-[1.75rem] sm:w-44 w-36 cursor-pointer"
                />
              </div>

              <button
                onClick={isMobile ? toggleMobileSidebar : handleOpenSidebar}
                className={`flex-shrink-0 size-9 rounded-[12px] bg-[#7FB29D]/10 sm:p-2 p-1.5`}
              >
                <PanelRightClose
                  strokeWidth={1.5}
                  size={20}
                  className="rounded-sm rotate-180 text-white"
                />
              </button>
            </div>
          </div>

          {/* New Research Button */}
          <div className="mt-10 px-6">
            <Link
              href="/"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="flex items-center justify-center w-full self-stretch rounded-[10px] bg-[#4B9770] py-3 px-2 gap-2 text-white text-base font-medium transition-colors capitalize not-italic leading-normal"
            >
              <Plus className="text-white size-5 aspect-square" />
              <span>New Research</span>
            </Link>
          </div>

          <div className="my-6 flex items-center justify-between text-black px-6">
            <div className="flex items-center gap-x-1">
              <Image src="/icons/thread_icon.svg" alt="thread" height={20} width={20} />

              <span className="text-white text-sm lg:text-base">Thread History</span>
            </div>
            <button onClick={() => setThreadSearchOpen(true)} className="cursor-pointer text-white">
              <HiOutlineSearch size={20} />
            </button>
          </div>

          {/* Session History */}
          <div className="flex-1 w-full overflow-y-auto mb-2" ref={scrollRef}>
            <div className="pl-6 pr-4 space-y-4 w-full">
              {sessionHistoryData &&
                sessionHistoryData.map((group, gi) => {
                  return (
                    <div key={gi}>
                      <div className="pb-1.5 text-sm font-medium text-white lg:text-xs">
                        {group.timeline}
                      </div>
                      {group.data.map((item) => (
                        <div
                          onClick={() => handleSessionTiltleClick(item.id)}
                          key={item.id}
                          className={cn(
                            'self-stretch p-2.5 flex group h-[2.375rem] items-center gap-x-2 justify-between cursor-pointer rounded-[0.5rem] font-semibold text-xs not-italic leading-normal',
                            sessionId === item.id
                              ? 'bg-[#7FB29D]/10 text-white'
                              : 'text-white hover:bg-[#7FB29D]/10 hover:text-white'
                          )}
                        >
                          <span className="flex-1 min-w-0 w-full truncate">{item.title}</span>

                          <DropdownMenu>
                            <DropdownMenuTrigger className="focus:border-none">
                              <EllipsisVertical className="size-[18px] aspect-square group-hover:block hidden" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-primary-light p-2 mt-6 mr-20 rounded-lg">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDeleteModal(true);
                                }}
                                className="flex gap-x-1.5 items-center font-medium cursor-pointer"
                              >
                                <Image
                                  src="/icons/delete_icon.svg"
                                  alt="icon"
                                  height={20}
                                  width={20}
                                  priority
                                />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  );
                })}
            </div>
            {openDeleteModal && (
              <DeleteConfirmationModal
                isOpen={openDeleteModal}
                onClose={() => setOpenDeleteModal(false)}
                onDelete={() => {
                  if (sessionId) handleOptionClick(sessionId);
                }}
              />
            )}
            {historyLoading ? (
              <LoaderComponent height={40} isSidebar={true} />
            ) : (
              <div ref={bottomRef} className="h-10"></div>
            )}
          </div>

          {/* <User/> Section */}

          <AccountDropdown
            ref={dropdownRef}
            items={accountMenuItems}
            triggerElement={
              <div className="p-2 mx-6 cursor-pointer rounded-lg flex items-center bg-[#26443A] justify-between">
                <div className="flex items-center overflow-hidden">
                  <div className="w-8 h-8 rounded-md bg-[#0E2313] flex items-center justify-center text-white font-medium mr-2">
                    {userName?.charAt(0).toUpperCase() || ''}
                  </div>
                  <div className="text-sm max-w-[150px] truncate text-white font-medium lg:text-base">
                    {userName || ''}
                  </div>
                  <ChevronDown size={16} className="ml-1 size-5 text-white" />
                </div>
                <button className="p-1 hover:bg-[#0E2313] rounded transition-colors text-base">
                  <Settings strokeWidth={1.5} className="text-white size-5" />
                </button>
              </div>
            }
          />
        </motion.div>

        {threadSearchOpen && (
          <SearchThreadsDialog open={threadSearchOpen} onOpenChange={setThreadSearchOpen} />
        )}
        <LogoutDialog open={open} onHandleChange={() => setOpen(!open)} />
      </>
    );
  }

  // Collapsed sidebar content (desktop only)
  return (
    <>
      <motion.div
        key="collapsed"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={sidebarOpenVariants}
        className="h-full w-full flex flex-col py-10 bg-[#102822]"
      >
        <div className="flex items-center flex-col w-full">
          {!isChartInsightChatRoute && (
            <button onClick={handleOpenSidebar} className="flex items-center justify-center mb-6">
              <Image src="/icons/menu_icon.svg" alt="menu" height={28} width={28} />
            </button>
          )}
          <div onClick={() => router.push('/')}>
            <Image
              src="/images/logo_ia2.svg"
              width={42}
              height={42}
              alt="logo"
              className="size-[2.625rem] cursor-pointer"
            />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/')}
                  className="mt-10 flex size-10 items-center justify-center rounded-full bg-[#4B9770] p-2"
                >
                  <Plus className="size-5 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>New Chat</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex-grow overflow-y-auto scrollbar-hide">
          {/* <div className="flex flex-col items-center">
            {images.map((image) => (
              <button
                onClick={() => setActiveMenu(image.id)}
                key={image.id}
                className={cn("w-full py-3 flex items-center justify-center", {
                 "border-r-2 border-primary-main": activeMenu === image.id,
                })}
              >
               

                {
                  <Image
                    src={image.src}
                    alt={image.src}
                    height={28}
                    width={28}
                  />
                
                }
              </button>
            ))}
          </div> */}
        </div>

        <div className="mt-auto">
          <div className="flex flex-col items-center">
            <AccountDropdown
              ref={dropdownRef}
              items={accountMenuItems}
              triggerElement={
                <div className="bg-[rgba(127,178,157,0.1)] cursor-pointer w-[2.625rem] rounded-lg flex flex-col items-center">
                  <button className="bg-[#7FB29D] w-full h-[2.625rem] flex items-center justify-center rounded-lg">
                    <span className="text-xl font-medium text-white">
                      {userName?.charAt(0).toUpperCase() || ''}
                    </span>
                  </button>

                  <button className="flex-shrink-0 p-[11px] bg-[]">
                    <Settings strokeWidth={1.5} className="text-white" />
                  </button>
                </div>
              }
            />
          </div>
        </div>
      </motion.div>
      <LogoutDialog open={open} onHandleChange={() => setOpen(!open)} />
    </>
  );
};

interface SidebarProps {
  isChartInsightChatRoute?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isChartInsightChatRoute }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const userName = useAuthStore((state) => state.username);
  const router = useRouter();
  const param = useSearchParams();

  useEffect(() => {
    const searchParamId = param.get('search');
    if (searchParamId) {
      setSessionId(searchParamId);
    }
  }, [param]);

  const toggleMobileSidebar = (): void => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const handleOpenSidebar = (): void => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="bg-[var(--primary-main-bg)]">
      {/* Mobile Top Bar */}
      {!isChartInsightChatRoute && (
        <div
          className="lg:hidden h-[4.75rem] sticky top-0 w-full flex items-center justify-between z-50"
          id="sravan"
        >
          <MobileHeader onMenuClick={toggleMobileSidebar} />
        </div>
      )}

      {/* Desktop Sidebar */}
      <div
        className={cn(
          'lg:flex hidden h-screen flex-col mr-5 bg-white transition-all duration-500 ease-in-out',
          {
            'w-[17.5rem]': isSidebarOpen,
            'w-[7.5rem]': !isSidebarOpen,
            'mr-0': isChartInsightChatRoute,
          }
        )}
      >
        <div className="h-full bg-primary-light">
          <AnimatePresence mode="wait">
            <SidebarContent
              isSidebarOpen={isSidebarOpen}
              handleOpenSidebar={handleOpenSidebar}
              sessionId={sessionId}
              userName={userName}
              router={router}
              isChartInsightChatRoute={isChartInsightChatRoute}
            />
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex"
            onClick={toggleMobileSidebar}
          >
            {/* Mobile Sidebar */}
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={sidebarVariants}
              className="sm:w-[40%] w-[80%] bg-white h-full shadow-lg overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent
                isSidebarOpen={true}
                handleOpenSidebar={handleOpenSidebar}
                sessionId={sessionId}
                userName={userName}
                router={router}
                isMobile={true}
                toggleMobileSidebar={toggleMobileSidebar}
                setIsMobileSidebarOpen={setIsMobileSidebarOpen}
                isChartInsightChatRoute={isChartInsightChatRoute}
              />
            </motion.div>

            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="sm:w-[60%] w-[20%] bg-black"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Sidebar;

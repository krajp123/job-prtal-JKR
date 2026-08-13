import { AnimatePresence, motion } from 'framer-motion';

/**
 * Props
 * - isOpen: boolean
 * - onClose: () => void
 * - videoSrc: string — path/URL to the demo video (mp4) OR a YouTube/Vimeo embed URL
 */
export default function VideoModal({ isOpen, onClose, videoSrc = '/video.mp4' }) {
    const isEmbed = /youtube\.com|youtu\.be|vimeo\.com/.test(videoSrc);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Job Portal demo video"
                        className="relative w-full max-w-[860px] overflow-hidden rounded-[16px] border border-white/15 bg-black shadow-[0_30px_90px_-20px_rgba(0,0,0,0.7)]"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={onClose}
                            aria-label="Close video"
                            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                        >
                            ✕
                        </button>

                        <div className="aspect-video w-full bg-black">
                            {isEmbed ? (
                                <iframe
                                    className="h-full w-full"
                                    src={videoSrc}
                                    title="Job Portal demo"
                                    allow="autoplay; encrypted-media; picture-in-picture"
                                    allowFullScreen
                                />
                            ) : (
                                <video className="h-full w-full" src={videoSrc} controls autoPlay />
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
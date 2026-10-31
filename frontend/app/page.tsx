"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useState, useEffect, useCallback, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import BrandEntrance from "@/components/BrandEntrance";
import ConsultationDialog from "@/components/ConsultationDialog";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Ruler,
  Scissors,
  Eye,
  Calendar,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
  Star,
  Quote,
  Sparkles,
  Phone,
  MapPin,
  X,
} from "lucide-react";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const testimonialVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 140 : -140,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.55, ease: "easeOut" },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -140 : 140,
    opacity: 0,
    transition: { duration: 0.45, ease: "easeIn" },
  }),
};

const processSteps = [
  { icon: Calendar, label: "Consult", description: "Share your vision" },
  { icon: Ruler, label: "Measure", description: "Precise fittings" },
  { icon: Scissors, label: "Cut", description: "Expert pattern making" },
  { icon: Sparkles, label: "Stitch", description: "Artisanal crafting" },
  { icon: Eye, label: "Trial", description: "Perfect the fit" },
  { icon: ArrowRight, label: "Deliver", description: "To your doorstep" },
];

const featuredCategories = [
    {
        name: "Sarees & Blouses",
        description: "Elegant drapes with custom-fitted blouse designs",
        image: "/images/saree-card.webp",
        imageAlt: "Woman wearing an elegant traditional saree",
        catalogCategory: "Sarees & Blouses",
    },
    {
        name: "Kurta Sets",
        description: "Timeless sophistication for every occasion",
        image: "https://images.pexels.com/photos/20791992/pexels-photo-20791992.jpeg?auto=compress&cs=tinysrgb&w=1200",
        imageAlt: "Woman wearing an embroidered kurta and dupatta set",
        catalogCategory: "Kurtis & Sets",
    },
    {
        name: "Lehenga",
        description: "Bridal dreams crafted to perfection",
        image: "https://images.pexels.com/photos/33359858/pexels-photo-33359858.jpeg?auto=compress&cs=tinysrgb&w=1200",
        imageAlt: "Bride wearing a traditional embroidered lehenga",
        catalogCategory: "Lehengas",
    },
];

export default function Home() {
  const [showEntrance, setShowEntrance] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isConsultationOpen, setIsConsultationOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [testimonialDirection, setTestimonialDirection] = useState(1);
  const [testimonials, setTestimonials] = useState<{
    name: string;
    role: string;
    quote: string;
    rating: number;
  }[]>([]);

  const { user } = useAuth();

  const [reviewRating, setReviewRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
const [reviewError, setReviewError] = useState("");

const isCustomer = user?.role === "customer";

const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const selectRating = (value: number) => {
    setReviewRating(value);
    setReviewError("");
  };

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReviewError("");

    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      setReviewError("Please select a rating between 1 and 5.");
      return;
    }
    if (!reviewComment.trim()) {
      setReviewError("Please write a review before submitting.");
      return;
    }

    setReviewSubmitting(true);
    try {
      await API.post("/reviews", {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewSubmitted(true);
      setIsReviewModalOpen(false);
      setReviewRating(null);
      setReviewComment("");
      const res = await API.get("/reviews");
      const fetched = res.data?.data?.reviews || [];
      setTestimonials(
        fetched.map((r: { customer?: { name?: string }; comment?: string; rating?: number }) => ({
          name: r?.customer?.name || "A customer",
          role: "Customer",
          quote: r?.comment,
          rating: r?.rating,
        })),
      );
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setReviewError(
        axiosError.response?.data?.message ||
          "Could not submit your review. Please try again.",
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await API.get("/reviews");
        const fetched = res.data?.data?.reviews || [];
        setTestimonials(
          fetched.map((r: { customer?: { name?: string }; comment?: string; rating?: number }) => ({
            name: r?.customer?.name || "A customer",
            role: "Customer",
            quote: r?.comment,
            rating: r?.rating,
          })),
        );
      } catch (err) {
        console.error("Failed to load reviews:", err);
        setTestimonials([]);
      }
    };
    fetchReviews();
  }, []);

  useEffect(() => {
    // Prevent browser-dependent animation content from rendering on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  const handleEntranceFadeStart = useCallback(() => setShowContent(true), []);
  const handleEntranceComplete = useCallback(() => setShowEntrance(false), []);

  useEffect(() => {
    if (!showContent || testimonials.length === 0) return;

    const interval = setInterval(() => {
      setTestimonialDirection(1);
      setActiveTestimonial((current) => (current + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTestimonial, showContent, testimonials.length]);

  if (!isClient) return null;

  return (
    <>
      {showEntrance && (
        <BrandEntrance
          onFadeStart={handleEntranceFadeStart}
          onComplete={handleEntranceComplete}
        />
      )}

      <div
        id="top"
        className={`relative overflow-hidden text-gray-900 transition-opacity duration-[1800ms] ${
          showContent ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Hero Section */}
        <section className="relative overflow-hidden py-12 sm:py-16 lg:min-h-[calc(100vh-4rem)] lg:py-12">
          <div className="pointer-events-none absolute -left-32 top-16 h-80 w-80 rounded-full bg-orange-200/30 blur-3xl" />
          <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="py-6 sm:py-10 lg:py-16"
            >
              <motion.div variants={fadeInUp} className="mb-7">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-800">
                  <span className="h-px w-8 bg-orange-500" />
                  Made slowly. Made for you.
                </span>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="mb-6 max-w-xl text-5xl font-semibold leading-[1.05] tracking-tight text-stone-900 sm:text-6xl lg:text-7xl"
              >
                A perfect fit,
                <br />
                <span className="font-serif italic font-normal text-orange-700">in every thread.</span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="mb-9 max-w-lg text-base leading-8 text-stone-600 sm:text-lg"
              >
                Thoughtful tailoring for sarees, kurta sets, and special occasions—made to your measurements and finished by hand.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/catalog"
                  className="group inline-flex items-center justify-center gap-3 rounded-full bg-orange-700 px-7 py-4 font-semibold text-white shadow-lg shadow-orange-950/10 transition hover:bg-orange-800"
                >
                  Explore the collection
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <button
                  type="button"
                  onClick={() => setIsConsultationOpen(true)}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-stone-300/80 bg-white/70 px-7 py-4 font-medium text-stone-800 transition hover:border-orange-400 hover:bg-white"
                >
                  <Calendar className="h-4 w-4 text-orange-700" />
                  Book a fitting
                </button>
              </motion.div>

              <motion.div variants={fadeInUp} className="mt-10 flex items-center gap-3 text-sm text-stone-500">
                <span className="h-px w-10 bg-cream-400" />
                Personal measurements · Artisanal finishing
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
              className="relative mx-auto w-full max-w-[540px]"
            >
              <div className="absolute -inset-3 rounded-t-[46%] rounded-b-[2rem] border border-orange-900/10" />
              <div className="relative aspect-[4/5] overflow-hidden rounded-t-[46%] rounded-b-[2rem] bg-cream-200 shadow-2xl shadow-stone-900/10">
                <Image
                  src="/images/saree-card.webp"
                  alt="A woman wearing a handwoven gold saree in an ornate palace interior"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-center"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/45 via-transparent to-transparent" />
                <div className="absolute bottom-7 left-7 right-7 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/75">The Darzaani touch</p>
                  <p className="mt-2 font-serif text-2xl italic sm:text-3xl">Tradition, tailored to you.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Craftsmanship Showcase */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="text-center mb-16"
            >
              <motion.span variants={fadeInUp} className="text-xs uppercase tracking-[0.2em] font-semibold text-orange-600">
                The Darज़ani Difference
              </motion.span>
              <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
                Craftsmanship at Every Step
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {[
                {
                  icon: Ruler,
                  title: "Precision Measurements",
                  description: "Save custom body profiles once, reuse for all future orders. Millimeter-perfect fits, every time.",
                },
                {
                  icon: Scissors,
                  title: "Premium Fabrics",
                  description: "Provide your own fabric with doorstep pickup, or let our artisans source the finest materials for you.",
                },
                {
                  icon: Eye,
                  title: "Live Tailoring Tracking",
                  description: "Watch your garment come to life. Real-time updates from cutting to trial-ready delivery.",
                },
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  variants={fadeInUp}
                  className="group relative bg-cream-50 rounded-3xl border border-cream-200 p-8 hover:border-orange-300 transition-all duration-300 hover:shadow-lg hover:shadow-orange-900/5"
                >
                  <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-200 transition-colors">
                    <feature.icon className="w-7 h-7 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* The Journey Process */}
        <section className="py-24 bg-gradient-to-b from-cream-100 to-cream-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="text-center mb-16"
            >
              <motion.span variants={fadeInUp} className="text-xs uppercase tracking-[0.2em] font-semibold text-orange-600">
                Your Journey
              </motion.span>
              <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
                From Vision to Reality
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="relative"
            >
              {/* Connection Line */}
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cream-300 to-transparent -translate-y-1/2 z-0" />

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 relative z-10">
                {processSteps.map((step, idx) => (
                  <motion.div
                    key={idx}
                    variants={fadeInUp}
                    className="text-center"
                  >
                    <div className="relative inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl border border-cream-200 shadow-sm hover:border-orange-300 hover:shadow-md transition-all mb-4">
                      <step.icon className="w-7 h-7 text-orange-600" />
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                        {idx + 1}
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">{step.label}</h4>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Featured Categories */}
        <section id="collections" className="scroll-mt-24 py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="text-center mb-16"
            >
              <motion.span variants={fadeInUp} className="text-xs uppercase tracking-[0.2em] font-semibold text-orange-600">
                Signature Collection
              </motion.span>
              <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
                Featured Creations
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {featuredCategories.map((category, idx) => (
                <motion.div
                  key={idx}
                  variants={fadeInUp}
                  className="group relative overflow-hidden rounded-3xl aspect-[3/4] cursor-pointer"
                >
                  <Link
                    href={`/catalog?category=${encodeURIComponent(category.catalogCategory)}`}
                    className="absolute inset-0 block"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-cream-200 via-cream-300 to-cream-400">
                      <Image
                        src={category.image}
                        alt={category.imageAlt}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        loading="lazy"
                        unoptimized
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent opacity-60 transition-opacity group-hover:opacity-80" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h3 className="mb-1 text-2xl font-bold">{category.name}</h3>
                      <p className="mb-4 text-sm text-gray-200">{category.description}</p>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-orange-300 transition-colors group-hover:text-orange-200">
                        View Collection
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 px-8 py-3 bg-cream-100 hover:bg-cream-200 text-gray-900 font-semibold rounded-xl border border-cream-300 transition-all"
              >
                View Full Catalog
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 bg-cream-100">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="text-center mb-16"
            >
              <motion.span variants={fadeInUp} className="text-xs uppercase tracking-[0.2em] font-semibold text-orange-600">
                Client Stories
              </motion.span>
              <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
                Words from Our Patrons
              </motion.h2>
            </motion.div>

            <div
              className="mx-auto max-w-3xl"
              aria-roledescription="carousel"
              aria-label="Client testimonials"
            >
              {testimonials.length > 0 ? (
                <>
                  <div className="relative min-h-[320px] overflow-hidden sm:min-h-[290px]">
                    <AnimatePresence initial={false} mode="wait" custom={testimonialDirection}>
                      <motion.div
                        key={activeTestimonial}
                        custom={testimonialDirection}
                        variants={testimonialVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.18}
                        onDragEnd={(_, info) => {
                          if (info.offset.x < -70) {
                            setTestimonialDirection(1);
                            setActiveTestimonial((current) => (current + 1) % testimonials.length);
                          } else if (info.offset.x > 70) {
                            setTestimonialDirection(-1);
                            setActiveTestimonial((current) => (current - 1 + testimonials.length) % testimonials.length);
                          }
                        }}
                        className="absolute inset-x-0 top-0 cursor-grab touch-pan-y active:cursor-grabbing"
                      >
                        <div className="relative flex min-h-[290px] flex-col items-center justify-center rounded-3xl border border-cream-200 bg-white px-7 py-8 text-center shadow-sm sm:px-12">
                          <Quote className="absolute right-6 top-5 h-10 w-10 text-orange-100" />
                          <div className="mb-5 flex items-center gap-1" aria-label={`${testimonials[activeTestimonial].rating} out of 5 stars`}>
                            {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-orange-500 text-orange-500" />
                            ))}
                          </div>
                          <p className="mb-7 max-w-2xl text-lg italic leading-relaxed text-gray-700 sm:text-xl">
                            &ldquo;{testimonials[activeTestimonial].quote}&rdquo;
                          </p>
                          <div className="flex items-center gap-3 text-left">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 font-bold text-white">
                              {testimonials[activeTestimonial].name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{testimonials[activeTestimonial].name}</h4>
                              <p className="text-xs text-gray-500">{testimonials[activeTestimonial].role}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-5">
                    <button
                      type="button"
                      onClick={() => {
                        setTestimonialDirection(-1);
                        setActiveTestimonial((current) => (current - 1 + testimonials.length) % testimonials.length);
                      }}
                      className="rounded-full border border-cream-300 bg-white p-2.5 text-gray-700 transition hover:border-orange-400 hover:text-orange-700"
                      aria-label="Previous testimonial"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-2" role="group" aria-label="Choose a testimonial">
                      {testimonials.map((testimonial, index) => (
                        <button
                          key={testimonial.name}
                          type="button"
                          onClick={() => {
                            setTestimonialDirection(index > activeTestimonial ? 1 : -1);
                            setActiveTestimonial(index);
                          }}
                          className={`h-2.5 rounded-full transition-all ${index === activeTestimonial ? "w-7 bg-orange-600" : "w-2.5 bg-orange-300 hover:bg-orange-400"}`}
                          aria-label={`Show testimonial ${index + 1}`}
                          aria-current={index === activeTestimonial}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTestimonialDirection(1);
                        setActiveTestimonial((current) => (current + 1) % testimonials.length);
                      }}
                      className="rounded-full border border-cream-300 bg-white p-2.5 text-gray-700 transition hover:border-orange-400 hover:text-orange-700"
                      aria-label="Next testimonial"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-stone-500 text-sm">
                    No reviews yet. Be the first to share your experience!
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Share Your Review */}
        {isClient && isCustomer && (
            <>
              {reviewSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-2xl mx-auto px-6 text-center py-12 rounded-3xl border border-cream-200 bg-cream-50 p-8"
                >
                  <Star className="h-12 w-12 text-orange-500 mb-4" />
                  <h2 className="text-2xl font-bold text-stone-900 mb-2">Thank you!</h2>
                  <p className="text-stone-600">
                    Your review has been submitted and will appear on the homepage.
                  </p>
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="max-w-2xl mx-auto block px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-800 bg-[#873b20] rounded-xl w-full sm:w-auto"
                >
                  Write a Review
                </button>
              )}

              {/* Review Modal */}
              <div
                className={`fixed inset-0 z-[100] flex items-center justify-center ${isReviewModalOpen ? "" : "hidden"}`}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setIsReviewModalOpen(false);
                }}
              >
                <div className="relative w-full max-w-md mx-auto p-4 sm:p-6">
                  <div className="rounded-3xl border border-[#e8dcc8] bg-white p-8 shadow-xl">
                    <button
                      type="button"
                      onClick={() => setIsReviewModalOpen(false)}
                      className="absolute top-4 right-4 p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    {reviewSubmitted ? (
                      <div className="text-center py-8">
                        <Star className="h-12 w-12 text-orange-500 mb-4" />
                        <h2 className="text-2xl font-bold text-stone-900 mb-2">Thank you!</h2>
                        <p className="text-stone-600">
                          Your review has been submitted and will appear on the homepage.
                        </p>
                      </div>
                    ) : (
                      <>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center mb-6"
                        >
                          <motion.span variants={fadeInUp} className="text-xs uppercase tracking-[0.2em] font-semibold text-orange-600">
                            Share Your Experience
                          </motion.span>
                          <motion.h2 variants={fadeInUp} className="text-xl md:text-2xl font-bold text-gray-900 mt-2">
                            We&apos;d Love to Hear From You
                          </motion.h2>
                          <p className="mt-1 text-stone-600">
                            Help future customers by sharing your experience with Darzaani.
                          </p>
                        </motion.div>

                        {reviewError && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                          >
                            {reviewError}
                          </motion.div>
                        )}

                        <form onSubmit={submitReview} className="space-y-4 rounded-3xl border border-[#e8dcc8] bg-white p-6 shadow-sm">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-stone-700">
                              Your Rating
                            </label>
                            <div className="flex items-center justify-center gap-1">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => selectRating(n)}
                                  aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                              className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
                                reviewRating !== null && n <= reviewRating
                                    ? "bg-orange-500 text-white"
                                    : "bg-stone-50 text-stone-500 hover:bg-orange-100 hover:text-orange-600"
                              }`}
                                >
                                  <Star className="h-5 w-5" />
                                </button>
                              ))}
                            </div>
                            {reviewRating === null && !reviewError && (
                              <p className="mt-2 text-xs text-stone-500 text-center">
                                Select a rating to continue
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block mb-2 text-sm font-medium text-stone-700">
                              Your Review
                            </label>
                            <textarea
                              value={reviewComment}
                              onChange={(event) => {
                                setReviewComment(event.target.value);
                                setReviewError("");
                              }}
                              rows={4}
                              placeholder="Share your experience with Darzaani…"
                              className="w-full rounded-xl border border-[#e8dcc8] bg-[#fdfcf8] px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-700 focus:ring-2 focus:ring-orange-100"
                              maxLength={1000}
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={reviewSubmitting || !reviewRating || !reviewComment.trim()}
                            className="w-full rounded-xl bg-[#873b20] px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {reviewSubmitting ? "Submitting…" : "Submit Review"}
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
        )}

        {/* Atelier Story */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto text-center"
            >
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-orange-600">
                Our Atelier
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3 mb-6">
                Preserving the Art of Indian Craftsmanship
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                Founded with a passion for keeping traditional Indian tailoring alive,
                Darज़ani bridges heritage techniques with modern convenience. Every garment
                we create is a testament to generations of artisanal expertise, tailored
                specifically for you.
              </p>
              <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  <span>Mumbai, India</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <span>Est. 2020</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 bg-gradient-to-r from-orange-600 to-orange-700 relative overflow-hidden">
          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <pattern id="ctaPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1.5" fill="white"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#ctaPattern)"/>
            </svg>
          </div>

          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Create Your Masterpiece?
              </h2>
              <p className="text-orange-100 mb-8 max-w-2xl mx-auto">
                Begin your bespoke journey today. Our master tailors are ready to bring your vision to life.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/catalog"
                  className="w-full sm:w-auto px-8 py-4 bg-white text-orange-700 font-semibold rounded-xl hover:bg-cream-50 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  Start Your Order
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setIsConsultationOpen(true)}
                  className="w-full sm:w-auto px-8 py-4 bg-orange-800/30 text-white font-semibold rounded-xl border border-white/30 hover:bg-orange-800/50 transition-all flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Schedule a Visit
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Floating WhatsApp Button */}
        <a
          href="https://wa.me/919876543210"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </a>
      </div>
      <ConsultationDialog
        open={isConsultationOpen}
        onClose={() => setIsConsultationOpen(false)}
      />
    </>
  );
}

/**
 * Pre-built FAQ packs per business vertical.
 * These are loaded as starter Q&A pairs during onboarding so SMB owners
 * don't have to write from scratch. They can edit, delete, or add to them.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_PACKS: Record<string, FaqItem[]> = {
  ecommerce: [
    { question: "What are your shipping times?", answer: "We typically ship within 1–2 business days. Standard delivery takes 3–7 business days depending on your location." },
    { question: "How do I track my order?", answer: "Once your order ships, you'll receive a tracking number by email. You can also ask me for your order status directly." },
    { question: "What is your return policy?", answer: "We accept returns within 30 days of purchase. Items must be unused and in original packaging. Contact us to start a return." },
    { question: "Do you offer free shipping?", answer: "Yes! We offer free standard shipping on orders over $50. Express shipping is available at checkout for an additional fee." },
    { question: "How long does a refund take?", answer: "Refunds are processed within 3–5 business days after we receive your return. The amount will be credited back to your original payment method." },
    { question: "Can I change or cancel my order?", answer: "Orders can be changed or cancelled within 1 hour of placing them. After that, please wait for delivery and then initiate a return." },
    { question: "Do you ship internationally?", answer: "We currently ship to [list your countries here]. International orders may be subject to customs fees." },
  ],

  saas: [
    { question: "How do I get started?", answer: "Sign up for a free account at our website. No credit card required. You'll have access to all core features immediately." },
    { question: "Is there a free plan?", answer: "Yes! Our free plan includes [your core features]. Upgrade to Pro when you need more usage or advanced features." },
    { question: "How do I reset my password?", answer: "Click 'Forgot password' on the login page and we'll send a reset link to your email within a few minutes." },
    { question: "Do you offer a refund?", answer: "We offer a 14-day money-back guarantee on all paid plans. No questions asked." },
    { question: "Can I upgrade or downgrade my plan?", answer: "Yes, you can change your plan any time from your account settings. Changes take effect immediately and are prorated." },
    { question: "Is my data secure?", answer: "All data is encrypted in transit and at rest. We are SOC 2 compliant and never share your data with third parties." },
    { question: "How do I contact support?", answer: "You can reach our support team via this chat or email us at support@[yourdomain.com]. We typically respond within a few hours." },
  ],

  restaurant: [
    { question: "Do you take reservations?", answer: "Yes! Reservations can be made through this chat, on our website, or by calling us. We recommend booking at least a day in advance for weekends." },
    { question: "What are your opening hours?", answer: "We're open Monday–Sunday, 11am–10pm. Kitchen closes at 9:30pm." },
    { question: "Do you have vegetarian/vegan options?", answer: "Yes! We have a dedicated vegetarian section on our menu. Many dishes can also be made vegan on request — just let us know." },
    { question: "Is there parking available?", answer: "Street parking is available on [street name]. We also validate parking at [parking lot name] — just bring your ticket inside." },
    { question: "Do you cater for large groups?", answer: "Absolutely! For groups of 10 or more, please contact us in advance so we can prepare adequately. Group menus are also available." },
    { question: "Do you offer takeaway or delivery?", answer: "Yes! Takeaway orders can be placed by calling us or through our app. We also deliver via [Swiggy/Zomato/DoorDash]." },
    { question: "Are there any allergy-friendly options?", answer: "Please let your server know about any allergies when ordering. We can accommodate most common allergies but cannot guarantee a 100% allergen-free kitchen." },
  ],

  healthcare: [
    { question: "How do I book an appointment?", answer: "You can book through this chat, on our website, or by calling us. We'll find a time that works for you." },
    { question: "What insurance do you accept?", answer: "We accept most major insurance plans including [list yours here]. Please bring your insurance card and a valid ID to your appointment." },
    { question: "What should I bring to my first appointment?", answer: "Please bring a valid photo ID, your insurance card, any referral letters, and a list of current medications." },
    { question: "How do I cancel or reschedule?", answer: "Please notify us at least 24 hours in advance to cancel or reschedule. Late cancellations may incur a fee." },
    { question: "Do you offer telehealth appointments?", answer: "Yes! Virtual appointments are available for many consultations. Ask us when booking to check if your visit qualifies." },
    { question: "What are your clinic hours?", answer: "We're open Monday–Friday: 9am–6pm, Saturday: 9am–1pm. Closed Sundays and public holidays." },
    { question: "How do I get my test results?", answer: "Results are typically available within 2–5 business days. We'll contact you directly, or you can check your patient portal." },
  ],

  realestate: [
    { question: "How do I schedule a property viewing?", answer: "You can book a viewing directly through this chat or call our office. Most viewings are available 7 days a week." },
    { question: "What areas do you cover?", answer: "We specialize in [your service areas]. Reach out and we'll let you know if we cover your preferred location." },
    { question: "What documents do I need to buy a property?", answer: "Typically: proof of identity, proof of address, proof of income, and pre-approval from your lender. We'll guide you through the rest." },
    { question: "Do you help with rentals too?", answer: "Yes! We manage both sales and rentals. Tell us what you're looking for and we'll match you with available listings." },
    { question: "What is your commission structure?", answer: "Our commission is [X]% of the sale price, paid at closing. There are no upfront fees." },
    { question: "How long does the buying process take?", answer: "On average, the process from offer to closing takes 30–60 days. We'll keep you informed at every step." },
  ],

  education: [
    { question: "How do I enroll in a course?", answer: "You can enroll directly on our website or through this chat. We'll walk you through the registration process step by step." },
    { question: "Do you offer certificates?", answer: "Yes! All our courses come with a certificate of completion. Select programs are accredited — ask us which ones qualify." },
    { question: "What is your refund policy?", answer: "We offer a full refund within 7 days of enrollment. After that, partial refunds may be available depending on course progress." },
    { question: "Are classes live or self-paced?", answer: "We offer both! Live cohort classes run on a fixed schedule, while self-paced courses can be completed at your own speed." },
    { question: "Do you offer payment plans?", answer: "Yes, we offer installment plans for most of our programs. Contact us to discuss the options available for your course." },
    { question: "How do I access course materials?", answer: "All materials are available in your student dashboard after enrollment. You'll have lifetime access to the content." },
  ],

  fitness: [
    { question: "Do you offer a free trial?", answer: "Yes! New members get their first class free. Come in any time during our open hours to give it a try." },
    { question: "What membership plans do you offer?", answer: "We have monthly and annual memberships. Check our website for current pricing, or ask me and I'll share the details." },
    { question: "How do I cancel my membership?", answer: "You can cancel anytime with 30 days written notice. Please email us or come in to sign a cancellation form." },
    { question: "Do I need to book classes in advance?", answer: "Popular classes fill up fast — we recommend booking via our app or website at least a day ahead." },
    { question: "Do you have personal trainers?", answer: "Yes! Our certified trainers offer one-on-one sessions. You can book a consultation to discuss your goals." },
    { question: "What are your operating hours?", answer: "We're open Monday–Friday: 6am–10pm, Saturday–Sunday: 8am–8pm. Holiday hours may vary." },
  ],

  professional: [
    { question: "How do I schedule a consultation?", answer: "Book a free 30-minute consultation through this chat or our website. We'll discuss your needs before any commitment." },
    { question: "What are your fees?", answer: "Our fees are based on the scope of work. We offer hourly rates, flat-fee packages, and retainer arrangements. Let's talk to find the best fit." },
    { question: "How long does the process typically take?", answer: "Timelines vary by project. During our consultation, we'll give you a realistic estimate based on your specific situation." },
    { question: "How do you handle client confidentiality?", answer: "All client information is kept strictly confidential. We comply with all applicable professional and privacy regulations." },
    { question: "What documents should I prepare?", answer: "This depends on your matter. We'll send you a checklist after your initial consultation so you know exactly what to bring." },
    { question: "Do you work remotely?", answer: "Yes! We work with clients remotely via video call and email. In-person meetings are also available at our office." },
  ],
};

/**
 * Get the FAQ pack for a business type, or an empty array if not found.
 */
export function getFaqPack(businessType: string): FaqItem[] {
  return FAQ_PACKS[businessType] ?? [];
}

/**
 * Default smart config values per business type.
 * Used by Quick Launch to pre-fill fields without requiring the full wizard.
 */
export const DEFAULT_CONFIG: Record<string, Record<string, string>> = {
  ecommerce: {
    welcomeMessage: "Hi there! 👋 I can help you track orders, process returns, or answer any questions about our products. What do you need?",
    businessHours: "Mon–Fri 9am–6pm",
    canProcessReturns: "Yes",
    canLookupOrders: "Yes",
  },
  saas: {
    welcomeMessage: "Hey! 👋 I'm here to help with billing questions, technical issues, or anything about your account. How can I help?",
    businessHours: "Mon–Fri 9am–6pm",
    canProcessReturns: "No",
    canLookupOrders: "Yes",
  },
  restaurant: {
    welcomeMessage: "Welcome! 🍽️ I can help you make a reservation, check our menu, or answer any questions. What can I do for you?",
    businessHours: "Daily 11am–10pm",
    canProcessReturns: "No",
    canLookupOrders: "No",
  },
  healthcare: {
    welcomeMessage: "Hello! 🏥 I can help you book an appointment, check our services, or answer general questions. How can I assist?",
    businessHours: "Mon–Fri 9am–6pm, Sat 9am–1pm",
    canProcessReturns: "No",
    canLookupOrders: "No",
  },
  realestate: {
    welcomeMessage: "Hi! 🏠 Looking to buy, sell, or rent? I can help schedule a viewing or answer your questions. What are you looking for?",
    businessHours: "Mon–Sat 9am–7pm",
    canProcessReturns: "No",
    canLookupOrders: "No",
  },
  education: {
    welcomeMessage: "Hi there! 📚 I can help with course information, enrollment, or any questions you have. What would you like to know?",
    businessHours: "Mon–Fri 9am–5pm",
    canProcessReturns: "No",
    canLookupOrders: "No",
  },
  fitness: {
    welcomeMessage: "Hey! 💪 Ready to start your fitness journey? I can help with membership info, class schedules, or bookings. What do you need?",
    businessHours: "Mon–Fri 6am–10pm, Sat–Sun 8am–8pm",
    canProcessReturns: "No",
    canLookupOrders: "No",
  },
  professional: {
    welcomeMessage: "Hello! ⚖️ I can help schedule a consultation, answer FAQs, or connect you with our team. How can I help today?",
    businessHours: "Mon–Fri 9am–6pm",
    canProcessReturns: "No",
    canLookupOrders: "No",
  },
};

export function getDefaultConfig(businessType: string): Record<string, string> {
  return DEFAULT_CONFIG[businessType] ?? {
    welcomeMessage: "Hi there! How can I help you today?",
    businessHours: "Mon–Fri 9am–5pm",
    canProcessReturns: "No",
    canLookupOrders: "No",
  };
}

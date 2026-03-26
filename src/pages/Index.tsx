import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import PlantShowcase from "@/components/landing/PlantShowcase";
import Features from "@/components/landing/Features";
import IoTSection from "@/components/landing/IoTSection";
import ExpertConsultation from "@/components/landing/ExpertConsultation";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import ChatbotButton from "@/components/ChatbotButton";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <PlantShowcase />
      <Features />
      <IoTSection />
      <ExpertConsultation />
      <CTA />
      <Footer />
      <ChatbotButton />
    </main>
  );
};

export default Index;

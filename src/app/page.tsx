import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Lessons from "@/components/Lessons";
import Shop from "@/components/Shop";
import Studio from "@/components/Studio";
import Activities from "@/components/Activities";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <About />
        <Lessons />
        <Shop />
        <Studio />
        <Activities />
      </main>
      <Footer />
    </>
  );
}

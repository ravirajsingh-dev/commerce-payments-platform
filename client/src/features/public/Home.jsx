import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { getHomepageContent } from "@src/app/state/actions/publicActions";
import HeroSlider from "./components/HeroSlider";
import ShowcaseSlider from "./components/ShowcaseSlider";
import SignatureStyles from "./components/SignatureStyles";
import Clientele from "./components/Clientele";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";

const FALLBACK_HOMEPAGE = {
  heroSliders: [
    {
      _id: "fallback-hero-1",
      heading: "A Legacy of Modern Royal Dressing",
      shortDesc:
        "Discover signature pieces crafted with timeless silhouettes and contemporary refinement.",
      buttonText: "Explore Collection",
      buttonLink: "/collections",
      status: true,
      image: "",
    },
  ],
  showcases: [
    {
      _id: "fallback-showcase-1",
      heading: "The Luxury Edit",
      description:
        "Ceremonial elegance and modern tailoring in one visual story.",
      images: [{ url: "", publicId: "fallback-showcase-image-1" }],
    },
  ],
  signatureStyles: [
    {
      _id: "fallback-style-1",
      title: "The Regal Suit",
      subtitle: "Jodhpuri Bandhgalas",
      image: "",
      routePath: "/collection/regal-suit-bandhgala",
    },
  ],
};

const Home = ({ getHomepageContent }) => {
  const [loading, setLoading] = useState(true);
  const [homepage, setHomepage] = useState({
    heroSliders: [],
    showcases: [],
    signatureStyles: [],
    clientele: [],
  });

  useEffect(() => {
    if (loading) return undefined;
    const elements = document.querySelectorAll(".fade-in-section");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
      },
    );

    elements.forEach((element) => {
      if (element.classList.contains("is-visible")) return;
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [loading, homepage]);

  useEffect(() => {
    const fetchHomepage = async () => {
      const result = await getHomepageContent();
      if (result?.status && result.data) {
        const responseData = result.data;
        setHomepage({
          heroSliders: responseData.heroSliders?.length
            ? responseData.heroSliders
            : FALLBACK_HOMEPAGE.heroSliders,
          showcases: responseData.showcases?.length
            ? responseData.showcases
            : FALLBACK_HOMEPAGE.showcases,
          signatureStyles: responseData.signatureStyles?.length
            ? responseData.signatureStyles
            : FALLBACK_HOMEPAGE.signatureStyles,
          clientele: Array.isArray(responseData.clientele)
            ? responseData.clientele
            : [],
        });
      } else {
        if (result?.error) {
          console.error("Failed to fetch homepage content:", result.error);
        }
        setHomepage(FALLBACK_HOMEPAGE);
      }
      setLoading(false);
    };
    fetchHomepage();
  }, [getHomepageContent]);

  if (loading) {
    return (
      <main className="home-page">
        <BouncingLoader />
      </main>
    );
  }

  return (
    <main className="home-page">
      <HeroSlider slides={homepage.heroSliders || []} />
      <ShowcaseSlider showcase={(homepage.showcases || [])[0]} />
      <div id="signature-styles">
        <SignatureStyles styles={homepage.signatureStyles || []} />
      </div>
      <Clientele items={homepage.clientele || []} />
    </main>
  );
};

const mapStateToProps = (_state) => ({});

export default connect(mapStateToProps, { getHomepageContent })(Home);

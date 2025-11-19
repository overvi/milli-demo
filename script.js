document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".trade-tab");
  const panels = document.querySelectorAll(".trade-form");
  const navLinks = document.querySelectorAll('a[href^="#"]');
  const statNumbers = document.querySelectorAll(".stat-number");
  const heroChartCanvas = document.getElementById("heroPriceChart");
  const heroChartTooltip = document.getElementById("heroChartTooltip");
  const heroRangeButtons = document.querySelectorAll(".hero-range");
  const stepItems = document.querySelectorAll(".step-item");
  const revealElements = document.querySelectorAll(".reveal-on-scroll");
  const licensesGallery = document.querySelector(".licenses-gallery");
  const licenseItems = document.querySelectorAll(".license-item");
  const licensePrev = document.querySelector(".licenses-arrow-prev");
  const licenseNext = document.querySelector(".licenses-arrow-next");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      tabs.forEach((t) => t.classList.toggle("active", t === tab));
      panels.forEach((panel) => {
        panel.classList.toggle(
          "trade-form-hidden",
          panel.dataset.panel !== target
        );
      });
    });
  });

  // Smooth scroll for in-page navigation
  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href") || "";
      const id = href.startsWith("#") ? href.slice(1) : null;
      if (!id) return;

      const target = document.getElementById(id);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // Animated statistics counters
  if (statNumbers.length) {
    const toPersianDigits = (value) =>
      value.toString().replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

    const animateNumber = (element) => {
      const target = Number(element.dataset.target || "0");
      const duration = 1500;
      const start = performance.now();

      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const current = Math.floor(target * progress);
        element.textContent = toPersianDigits(current);

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            statNumbers.forEach((node) => {
              if (!node.dataset.animated) {
                node.dataset.animated = "true";
                animateNumber(node);
              }
            });
            obs.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    const statsSection = document.querySelector(".stats-section");
    if (statsSection) {
      observer.observe(statsSection);
    }
  }

  // Hero price line chart (simple canvas-based chart)
  if (heroChartCanvas && heroChartCanvas.getContext) {
    const ctx = heroChartCanvas.getContext("2d");
    const dpi = window.devicePixelRatio || 1;

    const seriesByRange = {
      day: {
        label: "۲۴ ساعت اخیر",
        points: [111.2, 111.6, 111.4, 111.8, 112.1, 111.9, 112.4, 112.8, 112.6],
      },
      week: {
        label: "۷ روز گذشته",
        points: [108.5, 109.2, 110.4, 111.7, 112.3, 111.8, 112.9],
      },
      month: {
        label: "۳۰ روز گذشته",
        points: [102, 104, 103, 105, 106, 108, 109, 111, 112, 113, 114, 115],
      },
    };

    let currentRangeKey = "day";
    let cachedPoints = [];
    let hoverIndex = null;

    const formatPrice = (value) => {
      const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
      const rounded = Math.round(value * 1000); // pseudo price
      const withCommas = rounded
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        .replace(/\d/g, (d) => persianDigits[Number(d)]);
      return `${withCommas} ریال`;
    };

    const updateTooltip = () => {
      if (!heroChartTooltip) return;

      if (hoverIndex == null || !cachedPoints[hoverIndex]) {
        heroChartTooltip.classList.remove("visible");
        return;
      }

      const point = cachedPoints[hoverIndex];
      heroChartTooltip.textContent = formatPrice(point.value);
      const clampedX = Math.max(8, Math.min(point.x, heroChartCanvas.clientWidth - 8));
      const clampedY = Math.max(16, Math.min(point.y, heroChartCanvas.clientHeight - 8));
      heroChartTooltip.style.left = `${clampedX}px`;
      heroChartTooltip.style.top = `${clampedY}px`;
      heroChartTooltip.classList.add("visible");
    };

    const renderChart = () => {
      const rect = heroChartCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      heroChartCanvas.width = rect.width * dpi;
      heroChartCanvas.height = rect.height * dpi;
      ctx.setTransform(dpi, 0, 0, dpi, 0, 0);

      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const paddingX = 16;
      const paddingTop = 8;
      const paddingBottom = 10;

      const serie = seriesByRange[currentRangeKey] || seriesByRange.day;
      const values = serie.points;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = max - min || 1;

      const stepX =
        values.length > 1
          ? (width - paddingX * 2) / (values.length - 1)
          : width - paddingX * 2;

      const scaleY = (height - paddingTop - paddingBottom) / span;

      cachedPoints = [];

      // Filled area under the line
      ctx.beginPath();
      values.forEach((v, i) => {
        const x = paddingX + i * stepX;
        const y = height - paddingBottom - (v - min) * scaleY;
        cachedPoints.push({ x, y, value: v });
        if (i === 0) {
          ctx.moveTo(x, height - paddingBottom);
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      const lastX = paddingX + (values.length - 1) * stepX;
      ctx.lineTo(lastX, height - paddingBottom);
      ctx.closePath();

      const areaGradient = ctx.createLinearGradient(0, paddingTop, 0, height);
      areaGradient.addColorStop(0, "rgba(245, 158, 11, 0.45)");
      areaGradient.addColorStop(1, "rgba(245, 158, 11, 0.02)");
      ctx.fillStyle = areaGradient;
      ctx.fill();

      // Line
      ctx.beginPath();
      values.forEach((v, i) => {
        const x = paddingX + i * stepX;
        const y = height - paddingBottom - (v - min) * scaleY;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();

      // Last point highlight
      const lastValue = values[values.length - 1];
      const lastY = height - paddingBottom - (lastValue - min) * scaleY;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#d97706";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(253, 224, 171, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Hover crosshair
      if (hoverIndex != null && cachedPoints[hoverIndex]) {
        const p = cachedPoints[hoverIndex];
        ctx.beginPath();
        ctx.moveTo(p.x, paddingTop);
        ctx.lineTo(p.x, height - paddingBottom);
        ctx.strokeStyle = "rgba(248, 250, 252, 0.8)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#d97706";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(253, 224, 171, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      updateTooltip();
    };

    renderChart();
    window.addEventListener("resize", renderChart);

    const findNearestIndex = (clientX) => {
      if (!cachedPoints.length) return null;
      const rect = heroChartCanvas.getBoundingClientRect();
      const x = clientX - rect.left;
      let nearest = 0;
      let minDist = Infinity;
      cachedPoints.forEach((p, idx) => {
        const dist = Math.abs(p.x - x);
        if (dist < minDist) {
          minDist = dist;
          nearest = idx;
        }
      });
      return nearest;
    };

    const handlePointerMove = (clientX) => {
      hoverIndex = findNearestIndex(clientX);
      renderChart();
    };

    heroChartCanvas.addEventListener("mousemove", (event) => {
      handlePointerMove(event.clientX);
    });

    heroChartCanvas.addEventListener("mouseleave", () => {
      hoverIndex = null;
      renderChart();
      if (heroChartTooltip) {
        heroChartTooltip.classList.remove("visible");
      }
    });

    heroChartCanvas.addEventListener(
      "touchmove",
      (event) => {
        if (!event.touches.length) return;
        handlePointerMove(event.touches[0].clientX);
      },
      { passive: true }
    );

    heroChartCanvas.addEventListener(
      "touchstart",
      (event) => {
        if (!event.touches.length) return;
        handlePointerMove(event.touches[0].clientX);
      },
      { passive: true }
    );

    heroChartCanvas.addEventListener("touchend", () => {
      hoverIndex = null;
      renderChart();
      if (heroChartTooltip) {
        heroChartTooltip.classList.remove("visible");
      }
    });

    // Range switching buttons
    heroRangeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const range = btn.dataset.range;
        if (!range || !seriesByRange[range]) return;
        currentRangeKey = range;

        heroRangeButtons.forEach((b) => {
          const isActive = b === btn;
          b.classList.toggle("pill-primary", isActive);
          b.classList.toggle("pill-muted", !isActive);
          b.setAttribute("aria-pressed", isActive ? "true" : "false");
        });

        hoverIndex = null;
        renderChart();
      });
    });
  }

  // Steps section active state
  if (stepItems.length) {
    stepItems.forEach((item) => {
      item.addEventListener("click", () => {
        stepItems.forEach((el) => el.classList.toggle("active", el === item));
      });
    });
  }

  // Licenses slider
  if (
    licensesGallery &&
    licenseItems.length > 1 &&
    licensePrev &&
    licenseNext
  ) {
    let currentLicenseIndex = 0;

    const updateLicensesSlider = () => {
      const offset = -currentLicenseIndex * 100;
      licensesGallery.style.transform = `translateX(${offset}%)`;
    };

    licensePrev.addEventListener("click", () => {
      currentLicenseIndex =
        (currentLicenseIndex - 1 + licenseItems.length) % licenseItems.length;
      updateLicensesSlider();
    });

    licenseNext.addEventListener("click", () => {
      currentLicenseIndex = (currentLicenseIndex + 1) % licenseItems.length;
      updateLicensesSlider();
    });

    // Ensure initial positioning
    updateLicensesSlider();
  }

  // Scroll reveal animations
  if (revealElements.length) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    revealElements.forEach((el, index) => {
      // small stagger via transition delay
      el.style.transitionDelay = `${index * 40}ms`;
      revealObserver.observe(el);
    });
  }
});

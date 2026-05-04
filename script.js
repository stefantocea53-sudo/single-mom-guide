// ===============================
// MOBILE MENU
// ===============================

function toggleMenu() {
    const navLinks = document.getElementById("navLinks");

    if (navLinks) {
        navLinks.classList.toggle("active");
    }
}

// Închide meniul după ce apeși pe un link
const menuLinks = document.querySelectorAll(".nav-links a");

menuLinks.forEach(function(link) {
    link.addEventListener("click", function() {
        const navLinks = document.getElementById("navLinks");

        if (navLinks) {
            navLinks.classList.remove("active");
        }
    });
});


// ===============================
// FAQ ACCORDION
// ===============================

function toggleFaq(button) {
    const faqItem = button.parentElement;
    const allFaqItems = document.querySelectorAll(".faq-item");

    // Închide celelalte întrebări
    allFaqItems.forEach(function(item) {
        if (item !== faqItem) {
            item.classList.remove("active");
        }
    });

    // Deschide/închide întrebarea apăsată
    faqItem.classList.toggle("active");
}


// ===============================
// ACTIVE NAV LINK ON SCROLL
// ===============================

const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".nav-links a");

window.addEventListener("scroll", function() {
    let currentSection = "";

    sections.forEach(function(section) {
        const sectionTop = section.offsetTop - 120;
        const sectionHeight = section.offsetHeight;

        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            currentSection = section.getAttribute("id");
        }
    });

    navLinks.forEach(function(link) {
        link.classList.remove("active-link");

        if (link.getAttribute("href") === "#" + currentSection) {
            link.classList.add("active-link");
        }
    });
});


// ===============================
// SCROLL ANIMATIONS
// ===============================

const animatedElements = document.querySelectorAll(
    ".info-card, .inside-item, .testimonial-card, .pricing-card, .about-content, .quote-box"
);

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
        if (entry.isIntersecting) {
            entry.target.classList.add("show");
        }
    });
}, {
    threshold: 0.15
});

animatedElements.forEach(function(element) {
    element.classList.add("hidden");
    observer.observe(element);
});


// ===============================
// BACK TO TOP BUTTON
// ===============================

const backToTopButton = document.createElement("button");
backToTopButton.innerHTML = "↑";
backToTopButton.className = "back-to-top";
document.body.appendChild(backToTopButton);

window.addEventListener("scroll", function() {
    if (window.scrollY > 500) {
        backToTopButton.classList.add("visible");
    } else {
        backToTopButton.classList.remove("visible");
    }
});

backToTopButton.addEventListener("click", function() {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});


// ===============================
// PAYPAL BUTTON CHECK
// ===============================

const paypalBtn = document.getElementById("paypalBtn");

if (paypalBtn) {
    paypalBtn.addEventListener("click", function(event) {
        const paypalLink = paypalBtn.getAttribute("href");

        if (
            paypalLink === "YOUR_PAYPAL_LINK_HERE" ||
            paypalLink === "" ||
            paypalLink === "#"
        ) {
            event.preventDefault();

            alert("PayPal link is not added yet. Replace YOUR_PAYPAL_LINK_HERE with your real PayPal payment link.");
        }
    });
}


// ===============================
// CURRENT YEAR IN FOOTER
// ===============================

const yearSpan = document.getElementById("year");

if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
}


// ===============================
// SMALL HERO TEXT ANIMATION
// ===============================

window.addEventListener("load", function() {
    const heroText = document.querySelector(".hero-text");
    const heroCard = document.querySelector(".hero-card");

    if (heroText) {
        heroText.classList.add("hero-loaded");
    }

    if (heroCard) {
        heroCard.classList.add("hero-loaded");
    }
});

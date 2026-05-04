function toggleMenu() {
    const navLinks = document.getElementById("navLinks");

    if (navLinks) {
        navLinks.classList.toggle("active");
    }
}

function toggleFaq(button) {
    const faqItem = button.parentElement;
    const allFaqItems = document.querySelectorAll(".faq-item");

    allFaqItems.forEach(function(item) {
        if (item !== faqItem) {
            item.classList.remove("active");
        }
    });

    faqItem.classList.toggle("active");
}

const navMenuLinks = document.querySelectorAll(".nav-links a");

navMenuLinks.forEach(function(link) {
    link.addEventListener("click", function() {
        const navLinks = document.getElementById("navLinks");

        if (navLinks) {
            navLinks.classList.remove("active");
        }
    });
});

const sections = document.querySelectorAll("section[id], header[id]");
const navLinks = document.querySelectorAll(".nav-links a");

window.addEventListener("scroll", function() {
    let currentSection = "";

    sections.forEach(function(section) {
        const sectionTop = section.offsetTop - 130;
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

const animatedElements = document.querySelectorAll(
    ".info-card, .inside-item, .testimonial-card, .pricing-card, .about-content, .quote-box, .legal-box, .contact-form"
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

const yearSpan = document.getElementById("year");

if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
}

function getCustomerEmail() {
    const emailInput = document.getElementById("customerEmail");
    return emailInput ? emailInput.value.trim() : "";
}

function hasAcceptedPolicies() {
    const checkbox = document.getElementById("acceptPolicies");
    return checkbox ? checkbox.checked : false;
}

function showPaymentMessage(message, type) {
    const paymentMessage = document.getElementById("paymentMessage");

    if (!paymentMessage) {
        return;
    }

    paymentMessage.textContent = message;

    if (type === "success") {
        paymentMessage.style.color = "#2e7d32";
    } else if (type === "error") {
        paymentMessage.style.color = "#c62828";
    } else {
        paymentMessage.style.color = "#9f4f43";
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

if (typeof paypal !== "undefined") {
    paypal.Buttons({
        createOrder: async function() {
            const email = getCustomerEmail();
            const acceptedTerms = hasAcceptedPolicies();

            if (!isValidEmail(email)) {
                showPaymentMessage("Please enter a valid email address before payment.", "error");
                throw new Error("Invalid email.");
            }

            if (!acceptedTerms) {
                showPaymentMessage("Please accept the Terms, Privacy Policy, Refund Policy, and Disclaimer.", "error");
                throw new Error("Policies not accepted.");
            }

            showPaymentMessage("Creating your secure PayPal order...", "info");

            const response = await fetch("/api/create-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    acceptedTerms: acceptedTerms
                })
            });

            const data = await response.json();

            if (!response.ok) {
                showPaymentMessage(data.error || "Could not create PayPal order.", "error");
                throw new Error(data.error || "Could not create PayPal order.");
            }

            return data.id;
        },

        onApprove: async function(data) {
            const email = getCustomerEmail();

            showPaymentMessage("Payment approved. Sending your PDF by email...", "info");

            const response = await fetch("/api/capture-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    orderID: data.orderID,
                    email: email
                })
            });

            const result = await response.json();

            if (!response.ok) {
                showPaymentMessage(result.error || "Payment issue. Please contact support.", "error");
                return;
            }

            showPaymentMessage("Success! Your PDF has been sent to your email.", "success");
        },

        onCancel: function() {
            showPaymentMessage("Payment was cancelled. You were not charged.", "error");
        },

        onError: function(error) {
            console.error(error);
            showPaymentMessage("Something went wrong with PayPal. Please try again.", "error");
        }
    }).render("#paypal-button-container");
} else {
    showPaymentMessage("PayPal could not load. Check your PayPal Client ID in index.html.", "error");
}

const contactForm = document.getElementById("contactForm");

if (contactForm) {
    contactForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const name = document.getElementById("contactName").value.trim();
        const email = document.getElementById("contactEmail").value.trim();
        const message = document.getElementById("contactMessage").value.trim();
        const contactStatus = document.getElementById("contactStatus");

        if (!name || !email || !message || !isValidEmail(email)) {
            contactStatus.textContent = "Please complete all contact fields correctly.";
            contactStatus.style.color = "#c62828";
            return;
        }

        contactStatus.textContent = "Sending message...";
        contactStatus.style.color = "#9f4f43";

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    message: message
                })
            });

            const data = await response.json();

            if (!response.ok) {
                contactStatus.textContent = data.error || "Could not send message.";
                contactStatus.style.color = "#c62828";
                return;
            }

            contactStatus.textContent = "Message sent successfully.";
            contactStatus.style.color = "#2e7d32";
            contactForm.reset();
        } catch (error) {
            contactStatus.textContent = "Could not send message. Please try again.";
            contactStatus.style.color = "#c62828";
        }
    });
}

// Cryptocurrency Price Fetcher from CoinGecko
async function fetchCryptoPrices() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        // Update Bitcoin price
        const btcElement = document.getElementById('btcPrice');
        if (btcElement) {
            btcElement.textContent = `$${data.bitcoin.usd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
        
        // Update Ethereum price
        const ethElement = document.getElementById('ethPrice');
        if (ethElement) {
            ethElement.textContent = `$${data.ethereum.usd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
        
        // Update USDT price
        const usdtElement = document.getElementById('usdtPrice');
        if (usdtElement) {
            usdtElement.textContent = `$${data.tether.usd.toFixed(4)}`;
        }
        
        return data;
    } catch (error) {
        console.error('Error fetching crypto prices:', error);
        
        // Show fallback demo prices
        const btcElement = document.getElementById('btcPrice');
        const ethElement = document.getElementById('ethPrice');
        const usdtElement = document.getElementById('usdtPrice');
        
        if (btcElement) btcElement.textContent = '$98,547.23';
        if (ethElement) ethElement.textContent = '$3,456.78';
        if (usdtElement) usdtElement.textContent = '$1.0000';
    }
}

// Mobile Menu Toggle
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (navMenu) {
        navMenu.classList.toggle('active');
    }
    if (menuToggle) {
        menuToggle.classList.toggle('active');
    }
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const nav = document.querySelector('nav');
    const navMenu = document.querySelector('.nav-menu');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (navMenu && menuToggle) {
        // Check if menu is open and click is outside nav
        if (navMenu.classList.contains('active') && !nav.contains(event.target)) {
            navMenu.classList.remove('active');
            menuToggle.classList.remove('active');
        }
    }
});

// Close mobile menu when clicking a link
function setupMenuLinkListeners() {
    const menuLinks = document.querySelectorAll('.nav-menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            const navMenu = document.querySelector('.nav-menu');
            const menuToggle = document.querySelector('.mobile-menu-toggle');
            if (navMenu && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                if (menuToggle) menuToggle.classList.remove('active');
            }
        });
    });
}

// Hide hamburger menu on desktop resize
function handleResize() {
    const navMenu = document.querySelector('.nav-menu');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (window.innerWidth > 768) {
        // Desktop view - ensure menu is visible and remove active class
        if (navMenu && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
        }
        if (menuToggle && menuToggle.classList.contains('active')) {
            menuToggle.classList.remove('active');
        }
    }
}

// Smooth Scroll Function
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Contact Form Handler
function handleSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = {
        firstName: document.getElementById('firstName')?.value,
        lastName: document.getElementById('lastName')?.value,
        email: document.getElementById('email')?.value,
        phone: document.getElementById('phone')?.value,
        investmentType: document.getElementById('investmentType')?.value,
        investment: document.getElementById('investment')?.value,
        experience: document.getElementById('experience')?.value,
        message: document.getElementById('message')?.value,
        newsletter: document.getElementById('newsletter')?.checked
    };
    
    // Show success message
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        form.style.display = 'none';
        successMessage.style.display = 'block';
        
        // Log form data (in production, this would send to a server)
        console.log('Form submitted:', formData);
        
        // Reset and show form again after 5 seconds
        setTimeout(() => {
            form.reset();
            form.style.display = 'grid';
            successMessage.style.display = 'none';
        }, 5000);
    } else {
        // Fallback alert if success message element doesn't exist
        const name = formData.firstName || document.getElementById('name')?.value;
        const email = formData.email;
        const investment = formData.investment || document.getElementById('investment')?.value;
        
        alert(`Thank you, ${name}! Your application for $${investment} investment has been received. We'll contact you at ${email} within 24 hours.`);
        form.reset();
    }
}

// Scroll to top function
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Add scroll to top button functionality
window.addEventListener('scroll', function() {
    const scrollBtn = document.getElementById('scrollTopBtn');
    if (scrollBtn) {
        if (window.pageYOffset > 300) {
            scrollBtn.style.display = 'block';
        } else {
            scrollBtn.style.display = 'none';
        }
    }
});

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Fetch crypto prices on page load
    fetchCryptoPrices();
    
    // Update prices every 60 seconds
    setInterval(fetchCryptoPrices, 60000);
    
    // Setup menu link listeners
    setupMenuLinkListeners();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Add active class to current page nav link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
    
    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            }
        });
    }, observerOptions);
    
    // Observe all feature cards, pricing cards, etc.
    const animatedElements = document.querySelectorAll('.feature-card, .pricing-card, .stat-card, .service-detail');
    animatedElements.forEach(el => observer.observe(el));
});

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchCryptoPrices,
        scrollToSection,
        handleSubmit,
        scrollToTop,
        toggleMobileMenu
    };
}
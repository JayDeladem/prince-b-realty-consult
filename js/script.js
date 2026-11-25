
/* =========================================
   1. MOBILE NAVIGATION
========================================= */

// Select the mobile menu button and navigation links
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

// Open and close the mobile navigation menu
if (menuToggle && navLinks) {

    menuToggle.addEventListener("click", function () {

        // Add or remove the show class
        navLinks.classList.toggle("show");

        // Update accessibility information
        const isExpanded = navLinks.classList.contains("show");
        menuToggle.setAttribute("aria-expanded", isExpanded);

    });

    // Close the menu when a navigation link is clicked
    const navigationItems = navLinks.querySelectorAll("a");

    navigationItems.forEach(function (link) {

        link.addEventListener("click", function () {

            navLinks.classList.remove("show");
            menuToggle.setAttribute("aria-expanded", "false");

        });

    });

}


/* =========================================
   2. PROPERTY CATEGORY FILTER
========================================= */

/* =========================================
   2 & 3. PROPERTY FILTER AND SEARCH
========================================= */

const categoryButtons = document.querySelectorAll(".category-btn");
const propertySearch = document.querySelector("#property-search");
let propertyCards = [];
const noProperties = document.querySelector("#no-properties");

// Store the currently selected category
let selectedCategory = "all";

// Function that filters properties
function filterProperties() {

    if (propertyCards.length === 0) {
        return;
    }

    const searchText = propertySearch
        ? propertySearch.value.toLowerCase().trim()
        : "";

    let visibleCount = 0;

    propertyCards.forEach(function (card) {

        const cardCategory = card.dataset.category;
        const cardText = card.textContent.toLowerCase();

        const matchesCategory =
            selectedCategory === "all" ||
            selectedCategory === cardCategory;

        const matchesSearch = cardText.includes(searchText);

        if (matchesCategory && matchesSearch) {

            card.style.display = "block";
            visibleCount++;

        } else {

            card.style.display = "none";

        }

    });

    // Display a message when no properties match
    if (noProperties) {
        noProperties.hidden = visibleCount !== 0;
    }

}


// Handle category button clicks
categoryButtons.forEach(function (button) {

    button.addEventListener("click", function () {

        selectedCategory = button.dataset.category;

        categoryButtons.forEach(function (item) {
            item.classList.remove("active");
        });

        button.classList.add("active");

        filterProperties();

    });

});


// Handle property search
if (propertySearch) {

    propertySearch.addEventListener("input", function () {
        filterProperties();
    });

}


/* =========================================
   4. PROPERTY DETAILS
========================================= */

// Select property detail buttons

/* =========================================
   8. OPEN PROPERTY DETAILS PAGE
========================================= */

// Get all property cards
const propertyItems = document.querySelectorAll(".property-item");

// Function to open the selected property's details page
function openPropertyDetails(propertyCard) {

    const propertyId = propertyCard.dataset.propertyId;

    if (propertyId) {

        window.location.href =
            "property-details.html?id=" + encodeURIComponent(propertyId);

    }

}


// Make each property image clickable
propertyItems.forEach(function(card) {

    const propertyImage = card.querySelector("img");

    if (propertyImage) {

        propertyImage.style.cursor = "pointer";

        propertyImage.addEventListener("click", function() {

            openPropertyDetails(card);

        });

    }

});


// Make each View Details button clickable
const detailsButtons = document.querySelectorAll(
    ".property-details-btn"
);

detailsButtons.forEach(function(button) {

    button.addEventListener("click", function() {

        const propertyCard = button.closest(".property-item");

        if (propertyCard) {

            openPropertyDetails(propertyCard);

        }

    });

});



/* =========================================
   5. CONTACT FORM VALIDATION
========================================= */

const contactForm = document.querySelector("#contact-form");

if (contactForm) {

    contactForm.addEventListener("submit", function (event) {

        // Prevent the default form submission
        event.preventDefault();

        // Get the form values
        const name = document.querySelector("#name").value.trim();
        const phone = document.querySelector("#phone").value.trim();
        const email = document.querySelector("#email").value.trim();
        const message = document.querySelector("#message").value.trim();

        // Check whether all fields are filled
        if (!name || !phone || !email || !message) {

            alert("Please complete all the fields.");
            return;

        }

        // Check whether the email address is valid
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {

            alert("Please enter a valid email address.");
            return;

        }

        // Prepare the email content
        const subject = encodeURIComponent("Website Enquiry - " + name);

        const body = encodeURIComponent(
            "Name: " + name + "\n" +
            "Phone: " + phone + "\n" +
            "Email: " + email + "\n\n" +
            "Message:\n" + message
        );

        // Open the user's default email application
        window.location.href =
            "mailto:info@princebrealty.com?subject=" +
            subject + "&body=" + body;

    });

}


/* =========================================
   6. GALLERY LIGHTBOX
========================================= */

// Select gallery images
const galleryImages = document.querySelectorAll(".gallery-item img");

// Create a lightbox when gallery images are clicked
if (galleryImages.length > 0) {

    galleryImages.forEach(function (image) {

        image.addEventListener("click", function () {

            // Create the lightbox container
            const lightbox = document.createElement("div");
            lightbox.className = "lightbox";

            // Create the enlarged image
            const enlargedImage = document.createElement("img");
            enlargedImage.src = image.src;
            enlargedImage.alt = image.alt;

            // Create the close button
            const closeButton = document.createElement("button");
            closeButton.className = "lightbox-close";
            closeButton.innerHTML = "&times;";
            closeButton.setAttribute("aria-label", "Close image");

            // Add elements to the lightbox
            lightbox.appendChild(closeButton);
            lightbox.appendChild(enlargedImage);

            // Add the lightbox to the page
            document.body.appendChild(lightbox);

            // Function to close the lightbox
            function closeLightbox() {
                lightbox.remove();
            }

            closeButton.addEventListener("click", closeLightbox);

            // Close when the dark background is clicked
            lightbox.addEventListener("click", function (event) {

                if (event.target === lightbox) {
                    closeLightbox();
                }

            });

        });

    });

}


/* =========================================
   6. PROPERTY DETAILS DATABASE
========================================= */

// Store property information in one place
async function loadCatalogue() {
    if (!document.querySelector('.property-grid')) return [];
    const listings = await WCM.get('/properties');
    if (!Array.isArray(listings)) throw new Error('Invalid catalogue');
    return listings;
}
const catalogueReady = loadCatalogue();
catalogueReady.catch(() => {});
async function displayPropertyDetails() {

// Get the property ID from the page URL
const urlParameters = new URLSearchParams(window.location.search);

const propertyId = urlParameters.get("id");

// Find the selected property
if (!document.querySelector('#property-details-content')) return;
const selectedProperty = propertyId ? await WCM.get('/properties/' + encodeURIComponent(propertyId)) : null;
document.querySelector('#property-loading').hidden = true;

// Get the property details page elements
const detailsContent = document.querySelector("#property-details-content");

const notFoundMessage = document.querySelector("#property-not-found");


// Only run this section on the property details page
if (detailsContent && notFoundMessage) {

    // Check whether the selected property exists
    if (selectedProperty) {
        detailsContent.hidden = false;
        document.querySelectorAll(".property-status").forEach(el => { el.textContent = selectedProperty.status === "active" ? "FOR SALE" : "Unavailable"; });

        // Display the property title
        document.querySelector("#detail-title").textContent =
            selectedProperty.title;

        // Display the property price
        document.querySelector("#detail-price").textContent =
            selectedProperty.price;

        // Display the property location
        document.querySelector("#detail-location").textContent =
            selectedProperty.display_location;

        // Display the property description
        document.querySelector("#detail-description").textContent =
            selectedProperty.description;


        // Display the main property image
        const mainImage = document.querySelector("#main-property-image");

        mainImage.src = selectedProperty.images[0];

        mainImage.alt = selectedProperty.image_alts?.[0] || selectedProperty.title;


        // Display the additional property images
        const thumbnailGallery = document.querySelector(
            "#property-thumbnail-gallery"
        );

        selectedProperty.images.forEach(function (image, index) {

            const thumbnail = document.createElement("img");

            thumbnail.src = image;

            thumbnail.alt = selectedProperty.image_alts?.[index] || selectedProperty.title + " image " + (index + 1);

            thumbnail.classList.add("property-thumbnail");

            // Change the main image when a thumbnail is clicked
           thumbnail.addEventListener("click",         function     () {
              mainImage.src = image;
                mainImage.alt = thumbnail.alt;

                const allThumbnails = document.querySelectorAll(".property-thumbnail");

                allThumbnails.forEach(function (item) {
                    item.classList.remove("active");
                });

                thumbnail.classList.add("active");
            });

            if (index === 0) {thumbnail.classList.add("active");
        }
        
            thumbnailGallery.appendChild(thumbnail);

        });


        // Display the property features
        const featuresList = document.querySelector("#detail-features");

        selectedProperty.features.forEach(function (feature) {

            const listItem = document.createElement("li");

            listItem.textContent = feature;

            featuresList.appendChild(listItem);

        });


        // Set up the telephone contact link
        const phoneNumber = "+233540179637";

        document.querySelector("#property-call-link").href =
            "tel:" + phoneNumber;


        // Create a property-specific WhatsApp message
        const whatsappMessage =
            "Hello Prince B Realty Consult, I am interested in " +
            selectedProperty.title +
            " listed at " +
            selectedProperty.price +
            " in " +
            selectedProperty.location +
            ". Please provide more information.";

        const whatsappLink =
            "https://wa.me/233540179637?text=" +
            encodeURIComponent(whatsappMessage);

        document.querySelector("#property-whatsapp-link").href =
            whatsappLink;


    } else {

        // Show an error message if the property ID is invalid
        detailsContent.hidden = true;

        notFoundMessage.hidden = false;

    }

}


}
displayPropertyDetails().catch(() => {
 const content = document.querySelector("#property-details-content");
 const error = document.querySelector("#property-not-found");
 const loading = document.querySelector('#property-loading'); if(loading) loading.hidden=true;
 if(content && error) { error.querySelector('h2').textContent='Property temporarily unavailable'; content.hidden=true; error.hidden=false; error.querySelector("p").textContent="The catalogue is temporarily unavailable. Please try again or contact us."; }
});

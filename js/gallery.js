// ==========================================================
// GALLERY - LAZY LOADING / INFINITE SCROLL
// ==========================================================

document.addEventListener("DOMContentLoaded", async () => {
    console.log("================================");
    console.log("GALLERY STARTED");
    console.log("================================");

    // ======================================================
    // ELEMENTS
    // ======================================================

    const grid =
        document.getElementById("gallery-grid");

    const loader =
        document.getElementById("gallery-loader");

    const endMessage =
        document.getElementById("gallery-end");

    const sentinel =
        document.getElementById("gallery-sentinel");

    if (!grid) {
        console.error(
            "Gallery Error: #gallery-grid not found"
        );

        return;
    }

    // ======================================================
    // CONFIGURATION
    // ======================================================

    const DATA_URL =
        "./data/gallery.json";

    const IMAGE_PATH =
        "./images/gallery/";

    const BATCH_SIZE = 8;

    // Load next batch when user is this close to bottom
    const LOAD_DISTANCE = 300;

    // ======================================================
    // STATE
    // ======================================================

    let galleryData = [];

    let currentIndex = 0;

    let loading = false;

    let finished = false;

    let observer = null;

    // ======================================================
    // IMAGE LAZY LOADING
    // ======================================================
    //
    // IMPORTANT:
    //
    // Gallery metadata is loaded immediately, but actual
    // image URLs are NOT assigned to image.src while cards
    // are being created.
    //
    // Instead:
    //
    //     image.dataset.src = imageUrl
    //
    // Then the image IntersectionObserver assigns:
    //
    //     image.src = image.dataset.src
    //
    // only when the image approaches the viewport.
    //
    // ======================================================

    let imageObserver = null;

    function loadGalleryImage(image) {
        if (!image) {
            return;
        }

        if (image.dataset.loaded === "true") {
            return;
        }

        const imageUrl =
            image.dataset.src;

        if (!imageUrl) {
            return;
        }

        // Prevent the same image from being requested twice.
        if (image.dataset.loading === "true") {
            return;
        }

        image.dataset.loading = "true";

        image.src = imageUrl;

        image.onload = () => {
            image.dataset.loaded = "true";
            image.dataset.loading = "false";

            image.classList.add("is-loaded");
        };

        image.onerror = () => {
            image.dataset.loaded = "error";
            image.dataset.loading = "false";

            console.error(
                "Image not found:",
                imageUrl
            );

            const wrapper =
                image.closest(
                    ".gallery-image-wrapper"
                );

            if (wrapper) {
                wrapper.innerHTML = `
                    <div class="image-error">
                        🖼️
                        <br>
                        Image not found
                        <br>
                        <small>
                            ${imageUrl
                                .split("/")
                                .pop()}
                        </small>
                    </div>
                `;
            }
        };
    }

    if (
        typeof IntersectionObserver !==
        "undefined"
    ) {
        imageObserver =
            new IntersectionObserver(
                entries => {
                    entries.forEach(
                        entry => {
                            if (
                                !entry.isIntersecting
                            ) {
                                return;
                            }

                            const image =
                                entry.target;

                            loadGalleryImage(
                                image
                            );

                            imageObserver.unobserve(
                                image
                            );
                        }
                    );
                },
                {
                    root: null,

                    // Start loading shortly before the
                    // image enters the viewport.
                    rootMargin:
                        `${LOAD_DISTANCE}px 0px`,

                    threshold: 0
                }
            );
    }

    function observeGalleryImage(
        image
    ) {
        if (!image) {
            return;
        }

        if (imageObserver) {
            imageObserver.observe(
                image
            );
        } else {
            // Browser fallback.
            loadGalleryImage(
                image
            );
        }
    }

    // ======================================================
    // LOAD SHARAVAK DATA
    // ======================================================

    try {
        const response =
            await fetch(
                DATA_URL +
                "?v=" +
                Date.now()
            );

        if (!response.ok) {
            throw new Error(
                `Unable to load gallery.json. HTTP ${response.status}`
            );
        }

        galleryData =
            await response.json();

        // --------------------------------------------------
        // Load Shravak data if helper exists
        // --------------------------------------------------

        if (
            typeof loadShravakData ===
            "function"
        ) {
            await loadShravakData();

            console.log(
                "Shravak data ready for gallery"
            );
        }

        // --------------------------------------------------
        // Validate
        // --------------------------------------------------

        if (!Array.isArray(galleryData)) {
            throw new Error(
                "gallery.json must contain an array"
            );
        }

        console.log(
            "Gallery records loaded:",
            galleryData.length
        );

        // ==================================================
        // SORT BY DATE
        // Newest → Oldest
        // ==================================================

        galleryData.sort(
            (a, b) => {
                return (
                    new Date(b.date) -
                    new Date(a.date)
                );
            }
        );

        console.log(
            "Gallery sorted newest → oldest"
        );

        console.table(
            galleryData
        );
    } catch (error) {
        console.error(
            "Gallery JSON error:",
            error
        );

        if (loader) {
            loader.innerHTML = `
                <div class="gallery-error">
                    <strong>
                        Gallery load नहीं हो पाई
                    </strong>

                    <br><br>

                    ${error.message}
                </div>
            `;
        }

        return;
    }

    // ======================================================
    // CREATE GALLERY CARD
    // ======================================================

    function createGalleryCard(item) {
        const card =
            document.createElement(
                "article"
            );

        card.className =
            "gallery-tile";

        // ==================================================
        // IMAGE
        // ==================================================

        const imageWrapper =
            document.createElement(
                "div"
            );

        imageWrapper.className =
            "gallery-image-wrapper";

        const image =
            document.createElement(
                "img"
            );

        const imageUrl =
            IMAGE_PATH +
            item.fileName;

        image.className =
            "gallery-image";

        // ==================================================
        // IMPORTANT CHANGE
        //
        // DO NOT set image.src here.
        //
        // This means creating the gallery card does NOT
        // immediately request the actual image.
        //
        // The URL is stored in data-src and the
        // IntersectionObserver loads it later.
        // ==================================================

        image.dataset.src =
            imageUrl;

        image.alt =
            item.title ||
            "Gallery image";

        image.loading =
            "lazy";

        image.decoding =
            "async";

        // ==================================================
        // IMAGE ERROR
        // ==================================================

        image.onerror = () => {
            console.error(
                "Image not found:",
                imageUrl
            );

            imageWrapper.innerHTML = `
                <div class="image-error">
                    🖼️
                    <br>
                    Image not found
                    <br>
                    <small>
                        ${item.fileName}
                    </small>
                </div>
            `;
        };

        imageWrapper.appendChild(
            image
        );

        // Start observing this image.
        //
        // The observer will assign image.src only when
        // the image approaches the viewport.
        observeGalleryImage(
            image
        );

        // ==================================================
        // DETAILS
        // ==================================================

        const details =
            document.createElement(
                "div"
            );

        details.className =
            "gallery-details";

        // ==================================================
        // SHARAVAK NAME
        // ==================================================

        let shravakEntry =
            null;

        if (
            typeof getShravakNameByDateSync ===
            "function"
        ) {
            shravakEntry =
                getShravakNameByDateSync(
                    item.date
                );
        }

        const title =
            document.createElement(
                "span"
            );

        title.className =
            "gallery-title";

        if (
            typeof getShravakDisplayName ===
            "function"
        ) {
            title.textContent =
                getShravakDisplayName(
                    shravakEntry
                );
        } else {
            title.textContent =
                item.title ||
                "श्रावक श्रेष्ठी";
        }

        const subtitle =
            document.createElement(
                "span"
            );

        subtitle.className =
            "gallery-subtitle";

        subtitle.textContent =
            item.subtitle ||
            "";

        details.appendChild(
            title
        );

        details.appendChild(
            subtitle
        );

        // ==================================================
        // CARD
        // ==================================================

        card.appendChild(
            imageWrapper
        );

        card.appendChild(
            details
        );

        // ==================================================
        // OPEN FULL IMAGE
        // ==================================================

        card.addEventListener(
            "click",
            () => {
                window.open(
                    imageUrl,
                    "_blank"
                );
            }
        );

        return card;
    }

    // ======================================================
    // LOAD NEXT BATCH
    // ======================================================

    function loadNextBatch() {
        // --------------------------------------------------
        // Already finished
        // --------------------------------------------------

        if (finished) {
            return;
        }

        // --------------------------------------------------
        // Prevent simultaneous loads
        // --------------------------------------------------

        if (loading) {
            return;
        }

        // --------------------------------------------------
        // Nothing remaining
        // --------------------------------------------------

        if (
            currentIndex >=
            galleryData.length
        ) {
            finishGallery();

            return;
        }

        loading = true;

        const start =
            currentIndex;

        const end =
            Math.min(
                currentIndex +
                BATCH_SIZE,

                galleryData.length
            );

        console.log(
            `Rendering ${start + 1} → ${end}`
        );

        // --------------------------------------------------
        // IMPORTANT:
        // Advance index BEFORE rendering.
        // This prevents duplicate batches.
        // --------------------------------------------------

        currentIndex =
            end;

        // --------------------------------------------------
        // Render
        // --------------------------------------------------

        for (
            let i = start;
            i < end;
            i++
        ) {
            const item =
                galleryData[i];

            if (
                !item ||
                !item.fileName
            ) {
                console.warn(
                    "Invalid gallery record:",
                    item
                );

                continue;
            }

            const card =
                createGalleryCard(
                    item
                );

            grid.appendChild(
                card
            );
        }

        loading = false;

        console.log(
            "Displayed:",
            currentIndex,
            "/",
            galleryData.length
        );

        // --------------------------------------------------
        // End?
        // --------------------------------------------------

        if (
            currentIndex >=
            galleryData.length
        ) {
            finishGallery();
        }
    }

    // ======================================================
    // FINISH
    // ======================================================

    function finishGallery() {
        if (finished) {
            return;
        }

        finished = true;

        console.log(
            "================================"
        );

        console.log(
            "GALLERY COMPLETE"
        );

        console.log(
            "Displayed:",
            currentIndex
        );

        console.log(
            "Total:",
            galleryData.length
        );

        console.log(
            "================================"
        );

        // --------------------------------------------------
        // Stop IntersectionObserver
        // --------------------------------------------------

        if (observer) {
            observer.disconnect();

            observer = null;
        }

        // --------------------------------------------------
        // Stop scroll listener
        // --------------------------------------------------

        window.removeEventListener(
            "scroll",
            handleScroll
        );

        // --------------------------------------------------
        // Hide loader
        // --------------------------------------------------

        if (loader) {
            loader.style.display =
                "none";
        }

        // --------------------------------------------------
        // Show end message
        // --------------------------------------------------

        if (endMessage) {
            endMessage.style.display =
                "block";
        }
    }

    // ======================================================
    // SCROLL FALLBACK
    // ======================================================

    function handleScroll() {
        if (
            finished ||
            loading
        ) {
            return;
        }

        const scrollPosition =
            window.innerHeight +
            window.scrollY;

        const pageHeight =
            document.documentElement
                .scrollHeight;

        const remaining =
            pageHeight -
            scrollPosition;

        if (
            remaining <=
            LOAD_DISTANCE
        ) {
            loadNextBatch();
        }
    }

    // ======================================================
    // INITIAL LOAD
    // ======================================================

    loadNextBatch();

    // ======================================================
    // INTERSECTION OBSERVER
    // ======================================================

    if (
        sentinel &&
        typeof IntersectionObserver !==
        "undefined"
    ) {
        console.log(
            "Gallery: IntersectionObserver enabled"
        );

        observer =
            new IntersectionObserver(
                entries => {
                    if (
                        entries.some(
                            entry =>
                                entry.isIntersecting
                        )
                    ) {
                        loadNextBatch();
                    }
                },
                {
                    root: null,

                    rootMargin:
                        "300px 0px",

                    threshold: 0
                }
            );

        observer.observe(
            sentinel
        );
    } else {
        // ==================================================
        // FALLBACK
        // ==================================================

        console.warn(
            "Gallery sentinel not found. Using scroll fallback."
        );

        window.addEventListener(
            "scroll",
            handleScroll,
            {
                passive: true
            }
        );
    }

    // ======================================================
    // SAFETY CHECK
    //
    // If the first batch does not fill the viewport,
    // automatically load more.
    // ======================================================

    setTimeout(
        () => {
            if (
                !finished &&
                document.documentElement
                    .scrollHeight
                    <=
                    window.innerHeight +
                    100
            ) {
                console.log(
                    "Viewport not filled. Loading another batch."
                );

                loadNextBatch();
            }
        },
        300
    );
});
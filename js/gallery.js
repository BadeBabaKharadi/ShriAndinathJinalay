// ==========================================================
// GALLERY
// Gallery JSON is the ONLY source of gallery information.
// No dependency on Shravak Shresthi / daily-data.js.
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
    // LOAD GALLERY JSON
    // ======================================================

    try {

        const response =
            await fetch(
                DATA_URL + "?v=" + Date.now()
            );


        if (!response.ok) {

            throw new Error(
                `Unable to load gallery.json. HTTP ${response.status}`
            );

        }


        galleryData =
            await response.json();


        // --------------------------------------------------
        // Validate
        // --------------------------------------------------

        if (!Array.isArray(galleryData)) {

            throw new Error(
                "gallery.json must contain an array"
            );

        }


        console.log(
            "Gallery JSON records:",
            galleryData.length
        );


        // --------------------------------------------------
        // Remove records without an image
        //
        // Future placeholder records can remain in JSON,
        // but should not participate in pagination.
        // --------------------------------------------------

        const totalRecords =
            galleryData.length;


        galleryData =
            galleryData.filter(
                item =>
                    item &&
                    typeof item.fileName === "string" &&
                    item.fileName.trim() !== ""
            );


        console.log(
            "Gallery records with images:",
            galleryData.length
        );


        console.log(
            "Gallery placeholders skipped:",
            totalRecords - galleryData.length
        );


        // --------------------------------------------------
        // Sort newest → oldest
        // --------------------------------------------------

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
            document.createElement("article");


        card.className =
            "gallery-tile";


        // ==================================================
        // IMAGE
        // ==================================================

        const imageWrapper =
            document.createElement("div");


        imageWrapper.className =
            "gallery-image-wrapper";


        const image =
            document.createElement("img");


        const imageUrl =
            IMAGE_PATH +
            item.fileName;


        image.className =
            "gallery-image";


        image.src =
            imageUrl;


        image.loading =
            "lazy";


        image.decoding =
            "async";


        // --------------------------------------------------
        // IMAGE ALT
        // --------------------------------------------------

        image.alt =
            item.title ||
            "Gallery image";


        // --------------------------------------------------
        // IMAGE LOADED
        // --------------------------------------------------

        image.addEventListener(
            "load",
            () => {

                image.classList.add(
                    "is-loaded"
                );

            },
            {
                once: true
            }
        );


        // --------------------------------------------------
        // IMAGE ERROR
        // --------------------------------------------------

        image.addEventListener(
            "error",
            () => {

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

            },
            {
                once: true
            }
        );


        imageWrapper.appendChild(
            image
        );


        // ==================================================
        // DETAILS
        // ==================================================

        const details =
            document.createElement("div");


        details.className =
            "gallery-details";


        // --------------------------------------------------
        // TITLE
        //
        // DIRECTLY FROM gallery.json
        // --------------------------------------------------

        const title =
            document.createElement("span");


        title.className =
            "gallery-title";


        title.textContent =
            item.title ||
            "";


        // --------------------------------------------------
        // SUBTITLE
        //
        // DIRECTLY FROM gallery.json
        // --------------------------------------------------

        const subtitle =
            document.createElement("span");


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

        if (finished) {
            return;
        }


        if (loading) {
            return;
        }


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
                currentIndex + BATCH_SIZE,
                galleryData.length
            );


        console.log(
            `Gallery: rendering ${start + 1} → ${end}`
        );


        // Advance before rendering
        currentIndex =
            end;


        // --------------------------------------------------
        // Render cards
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
                typeof item.fileName !== "string" ||
                item.fileName.trim() === ""
            ) {

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
            "Gallery: displayed",
            currentIndex,
            "/",
            galleryData.length
        );


        // --------------------------------------------------
        // Finished
        // --------------------------------------------------

        if (
            currentIndex >=
            galleryData.length
        ) {

            finishGallery();

        }

    }


    // ======================================================
    // FINISH GALLERY
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


        if (observer) {

            observer.disconnect();

            observer = null;

        }


        if (loader) {

            loader.style.display =
                "none";

        }


        if (endMessage) {

            endMessage.style.display =
                "block";

        }

    }


    // ======================================================
    // INITIAL LOAD
    // ======================================================

    loadNextBatch();


    // ======================================================
    // INFINITE SCROLL
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
                        `${LOAD_DISTANCE}px 0px`,

                    threshold: 0

                }
            );


        observer.observe(
            sentinel
        );


    } else {

        console.warn(
            "Gallery sentinel not found."
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
    // VIEWPORT SAFETY CHECK
    // ======================================================

    setTimeout(
        () => {

            if (
                !finished &&
                document.documentElement
                    .scrollHeight
                    <=
                    window.innerHeight + 100
            ) {

                console.log(
                    "Viewport not filled. Loading another batch."
                );


                loadNextBatch();

            }

        },
        500
    );

});
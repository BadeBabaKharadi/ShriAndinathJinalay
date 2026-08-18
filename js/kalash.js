document.addEventListener("DOMContentLoaded", async () => {

    // =========================================================
    // CONFIGURATION
    // =========================================================

    const DATA_URL = "./data/chaturmas-kalash.json";
    const IMAGE_PATH = "./images/kalash/";


    // =========================================================
    // ELEMENTS
    // =========================================================

    const grid = document.getElementById("kalash-grid");
    const loader = document.getElementById("kalash-loader");
    const emptyState = document.getElementById("kalash-empty");
    const resultCount = document.getElementById("kalash-result-count");

    const nameFilter =
        document.getElementById("kalash-name-filter");

    const typeFilter =
        document.getElementById("kalash-type-filter");

    const clearButton =
        document.getElementById("kalash-clear-filters");

    const numberFilter =
        document.getElementById("kalash-number-filter");


    if (!grid || !nameFilter || !typeFilter) {
        console.error("Kalash page elements are missing.");
        return;
    }


    // =========================================================
    // STATE
    // =========================================================

    let kalashData = [];
    // =========================================================
    // FIXED COLOR BY KALASH TYPE
    // =========================================================
    // Each category always gets the same color class.
    // No random colors are used, so refreshes remain consistent.

    const KALASH_COLOR_CLASS = {
        "jin-dharm-aaradhana": "kalash-card--mangal",
        "samayak-darshan": "kalash-card--darshan",
        "samayak-gyan": "kalash-card--gyan",
        "jinvani": "kalash-card--jinvani",
        "das-lakshan-dharm": "kalash-card--das-lakshan",
        "chaturmas-smriti-vidhya": "kalash-card--vidhya",
        "chaturmas-smriti-samay": "kalash-card--samay"
    };

    const DEFAULT_KALASH_COLOR_CLASS = "kalash-card--default";

    function getKalashColorClass(item) {
        const category = String(item?.category || "").trim();

        return (
            KALASH_COLOR_CLASS[category] ||
            DEFAULT_KALASH_COLOR_CLASS
        );
    }

    // =========================================================
    // LOADER
    // =========================================================

    function hideLoader() {

        if (loader) {
            loader.classList.add("is-hidden");
        }

    }


    // =========================================================
    // EMPTY STATE
    // =========================================================

    function showEmptyState(show) {

        if (!emptyState) {
            return;
        }

        emptyState.hidden = !show;

    }


    // =========================================================
    // HINDI DIGITS → ENGLISH DIGITS
    // =========================================================

    const hindiDigits = {
        "०": "0",
        "१": "1",
        "२": "2",
        "३": "3",
        "४": "4",
        "५": "5",
        "६": "6",
        "७": "7",
        "८": "8",
        "९": "9"
    };


    function normalizeDigits(value) {

        return String(value || "")
            .replace(
                /[०-९]/g,
                digit => hindiDigits[digit]
            );

    }


    // =========================================================
    // CONVERT DISPLAY AMOUNT TO SORTABLE VALUE
    //
    // २५ कलश २५ श्रीफल = 2525000
    // ५ कलश ५५ श्रीफल = 5555000? NO:
    //
    // 1 कलश  = 100000
    // 1 श्रीफल = 1000
    // =========================================================

    function getSortAmount(displayAmount) {

        if (!displayAmount) {
            return 0;
        }


        const text =
            normalizeDigits(displayAmount);


        const kalashMatch =
            text.match(/(\d+)\s*कलश/);


        const shrifalMatch =
            text.match(/(\d+)\s*श्रीफल/);


        const kalash =
            kalashMatch
                ? Number(kalashMatch[1])
                : 0;


        const shrifal =
            shrifalMatch
                ? Number(shrifalMatch[1])
                : 0;


        return (
            kalash * 100000 +
            shrifal * 1000
        );

    }


    // =========================================================
    // NORMALIZE SEARCH TEXT
    // =========================================================

    function normalizeText(value) {

        return String(value || "")
            .trim()
            .toLocaleLowerCase("hi-IN");

    }


    // =========================================================
    // SORT
    //
    // 1. Amount DESC
    // 2. Kalash Number ASC
    // =========================================================

    function sortKalash(records) {

        return [...records].sort((a, b) => {

            const amountA =
                getSortAmount(a.displayAmount);


            const amountB =
                getSortAmount(b.displayAmount);


            if (amountA !== amountB) {

                return amountB - amountA;

            }


            return (
                Number(a.kalashNumber || 0) -
                Number(b.kalashNumber || 0)
            );

        });

    }


    // =========================================================
    // OPTIONAL FAMILY IMAGE
    //
    // If there is no image:
    //     No image container is created.
    //
    // If image is invalid:
    //     Image container is removed.
    // =========================================================

    function createFamilyImage(item) {

        if (
            !item.familyImage ||
            !String(item.familyImage).trim()
        ) {
            return null;
        }

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "kalash-image-wrapper";


        const link =
            document.createElement("a");

        link.className =
            "kalash-image-link";

        const imageFile =
            String(item.familyImage).trim();


        const imageUrl =
            IMAGE_PATH +
            imageFile;


        /*
         * Clicking the image opens the
         * original/full-size image.
         *
         * target="_blank" works well on
         * GitHub Pages and mobile browsers.
         */

        link.href =
            imageUrl;

        link.target =
            "_blank";

        link.rel =
            "noopener noreferrer";


        const image =
            document.createElement("img");

        image.className =
            "kalash-family-image";


        image.src =
            imageUrl;


        image.alt =
            item.name
                ? `${item.name} परिवार`
                : "पुण्यार्जक परिवार";


        image.loading =
            "lazy";

        image.decoding =
            "async";


        /*
         * If the image doesn't exist,
         * remove the entire image section.
         */

        image.onerror = () => {
            wrapper.remove();
        };


        link.appendChild(image);

        wrapper.appendChild(link);


        return wrapper;
    }


    // =========================================================
    // CREATE KALASH CARD
    // =========================================================

    function createKalashCard(item) {

        const card =
            document.createElement("article");

        //card.className ="kalash-card";

        card.className =
            `kalash-card ${getKalashColorClass(item)}`;
        // -------------------------------------------------------
        // OPTIONAL FAMILY IMAGE
        // -------------------------------------------------------

        const image =
            createFamilyImage(item);


        if (image) {

            card.appendChild(image);

        }


        // -------------------------------------------------------
        // CARD BODY
        // -------------------------------------------------------

        const body =
            document.createElement("div");

        body.className =
            "kalash-card-body";


        // -------------------------------------------------------
        // KALASH NUMBER
        // -------------------------------------------------------

        const number =
            document.createElement("div");

        number.className =
            "kalash-number";


        number.textContent =
            `कलश #${item.kalashNumber}`;


        body.appendChild(number);


        // -------------------------------------------------------
        // NAME
        // -------------------------------------------------------

        if (item.name) {

            const name =
                document.createElement("div");

            name.className =
                "kalash-name";


            name.textContent =
                item.name;


            body.appendChild(name);

        }


        // -------------------------------------------------------
        // KALASH TYPE
        // -------------------------------------------------------

        if (item.kalashType) {

            const type =
                document.createElement("div");

            type.className =
                "kalash-type";


            type.textContent =
                item.kalashType;


            body.appendChild(type);

        }


        // -------------------------------------------------------
        // DISPLAY AMOUNT
        // -------------------------------------------------------
        /*
        if (item.displayAmount) {

            const amount =
                document.createElement("div");

            amount.className =
                "kalash-amount";


            amount.textContent =
                item.displayAmount;


            body.appendChild(amount);

        }*/


        // -------------------------------------------------------
        // ADDRESS
        // -------------------------------------------------------

        if (
            item.address &&
            String(item.address).trim()
        ) {

            const address =
                document.createElement("div");

            address.className =
                "kalash-address";


            address.textContent =
                `📍 ${item.address}`;


            body.appendChild(address);

        }


        // -------------------------------------------------------
        // COMMENTS
        // -------------------------------------------------------
        /*
        if (
            item.comments &&
            String(item.comments).trim()
        ) {

            const comments =
                document.createElement("div");

            comments.className =
                "kalash-comments";


            comments.textContent =
                item.comments;


            body.appendChild(comments);

        }*/


        card.appendChild(body);


        return card;

    }


    function populateNumberFilter(records) {

        const numbers =
            records
                .map(item => item.kalashNumber)
                .filter(
                    number =>
                        number !== null &&
                        number !== undefined &&
                        number !== ""
                )
                .sort(
                    (a, b) => Number(a) - Number(b)
                );


        numberFilter.innerHTML = "";


        const allOption =
            document.createElement("option");

        allOption.value = "";
        allOption.textContent =
            "सभी कलश नंबर";

        numberFilter.appendChild(
            allOption
        );


        numbers.forEach(number => {

            const option =
                document.createElement("option");

            option.value =
                String(number);

            option.textContent =
                `कलश #${number}`;

            numberFilter.appendChild(
                option
            );

        });

    }

    // =========================================================
    // POPULATE KALASH TYPE FILTER
    // =========================================================

    function populateTypeFilter(records) {

        const types =
            new Map();


        records.forEach(item => {

            const value =
                String(
                    item.kalashType || ""
                ).trim();


            if (!value) {
                return;
            }


            const category =
                String(
                    item.category || value
                ).trim();


            if (!types.has(category)) {

                types.set(
                    category,
                    value
                );

            }

        });


        const sortedTypes =
            [...types.entries()]
                .sort(
                    (a, b) =>
                        a[1].localeCompare(
                            b[1],
                            "hi-IN"
                        )
                );


        typeFilter.innerHTML = "";


        const allOption =
            document.createElement("option");


        allOption.value = "";


        allOption.textContent =
            "सभी कलश प्रकार";


        typeFilter.appendChild(
            allOption
        );


        sortedTypes.forEach(
            ([category, displayName]) => {

                const option =
                    document.createElement("option");


                option.value =
                    category;


                option.textContent =
                    displayName;


                typeFilter.appendChild(
                    option
                );

            }
        );

    }


    // =========================================================
    // FILTER + RENDER
    // =========================================================

    function render() {

        const searchText =
            normalizeText(
                nameFilter.value
            );

        const selectedNumber =
            String(
                numberFilter.value || ""
            ).trim();


        const selectedType =
            String(
                typeFilter.value || ""
            ).trim();


        const filtered =
            kalashData.filter(item => {

                const name =
                    normalizeText(
                        item.name
                    );


                const matchesName =
                    !searchText ||
                    name.includes(searchText);

                const matchesNumber =
                    !selectedNumber ||
                    String(item.kalashNumber) ===
                    selectedNumber;

                const matchesType =
                    !selectedType ||
                    String(
                        item.category || ""
                    ).trim() === selectedType;


                return (
                    matchesName &&
                    matchesType &&
                    matchesNumber
                );

            });


        const sorted =
            sortKalash(filtered);


        // Clear existing cards.

        grid.innerHTML = "";


        // Render cards.

        sorted.forEach(item => {

            grid.appendChild(
                createKalashCard(item)
            );

        });


        // Empty state.

        showEmptyState(
            sorted.length === 0
        );


        // Result count.

        if (resultCount) {

            resultCount.textContent =
                `${sorted.length} पुण्यार्जक`;

        }

    }


    // =========================================================
    // LOAD JSON
    // =========================================================

    try {

        const response =
            await fetch(
                DATA_URL +
                "?v=" +
                Date.now()
            );


        if (!response.ok) {

            throw new Error(
                `Unable to load chaturmas-kalash.json. HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!Array.isArray(data)) {

            throw new Error(
                "chaturmas-kalash.json must contain a JSON array."
            );

        }


        // Keep only valid objects.

        kalashData =
            data.filter(
                item =>
                    item &&
                    typeof item === "object"
            );


        console.log(
            "Kalash records loaded:",
            kalashData.length
        );


        // Populate filter options.

        populateTypeFilter(
            kalashData
        );

        populateNumberFilter(
            kalashData
        );

        // Initial render.

        render();


    } catch (error) {

        console.error(
            "Kalash page error:",
            error
        );


        grid.innerHTML = "";


        showEmptyState(true);


        if (resultCount) {

            resultCount.textContent =
                "पुण्यार्जक सूची उपलब्ध नहीं है";

        }


        const message =
            emptyState?.querySelector("p");


        if (message) {

            message.textContent =
                "सूची लोड नहीं हो सकी। कृपया बाद में पुनः प्रयास करें।";

        }

    } finally {

        hideLoader();

    }


    // =========================================================
    // FILTER EVENTS
    // =========================================================

    nameFilter.addEventListener(
        "input",
        render
    );


    typeFilter.addEventListener(
        "change",
        render
    );

    numberFilter.addEventListener(
        "change",
        render
    );

    clearButton?.addEventListener(
        "click",
        () => {

            nameFilter.value = "";
            typeFilter.value = "";
            numberFilter.value = "";

            render();

            nameFilter.focus();

        }
    );

});
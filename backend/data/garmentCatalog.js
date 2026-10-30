const standardSizes = ["XS", "S", "M", "L", "XL", "XXL"];

const imageByCategory = {
    sarees: "/images/saree-card.webp",
    kurtas:
        "https://images.pexels.com/photos/20791992/pexels-photo-20791992.jpeg?auto=compress&cs=tinysrgb&w=1200",
    lehengas:
        "https://images.pexels.com/photos/33359858/pexels-photo-33359858.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

const collections = [
    {
        category: "Sarees & Blouses",
        image: imageByCategory.sarees,
        colors: ["Rose gold", "Ruby", "Emerald", "Ivory", "Champagne"],
        products: [
            ["Kashi Gold Zari Silk Saree", "A luminous silk drape finished with a fine gold zari border and a tailored blouse option.", 12800, 18, "Pure silk"],
            ["Kanjivaram Temple Border Saree", "Rich silk with a traditional temple border, made for celebrations and heirloom moments.", 18500, 21, "Kanjivaram silk"],
            ["Chanderi Buti Saree", "Lightweight Chanderi woven with delicate buti motifs and a coordinated blouse piece.", 8400, 16, "Chanderi silk-cotton"],
            ["Soft Organza Floral Saree", "Airy organza with hand-finished floral embroidery and a custom-fit blouse.", 11200, 18, "Embroidered organza"],
            ["Tussar Handloom Saree", "Textured handloom Tussar with understated woven detailing for an elegant day look.", 7600, 15, "Tussar silk"],
            ["Paithani Peacock Motif Saree", "A festive Paithani-inspired drape with peacock motifs and a richly woven pallu.", 22400, 24, "Paithani silk"],
            ["Banarasi Brocade Saree", "Classic brocade with intricate floral zari work and a blouse tailored to your fit.", 16800, 21, "Banarasi silk"],
            ["Linen Jamdani Saree", "Breathable linen with fine Jamdani-inspired motifs for a modern heirloom feel.", 6900, 14, "Linen-cotton"],
            ["Embroidered Georgette Saree", "Fluid georgette with tonal thread embroidery and a softly finished edge.", 9800, 17, "Embroidered georgette"],
            ["Mysore Crepe Silk Saree", "Smooth crepe silk in a deep jewel tone with a minimal contrast border.", 10500, 18, "Mysore crepe silk"],
            ["Kora Silk Check Saree", "A lightweight Kora silk drape with a fine woven check and a contrast blouse piece.", 9200, 16, "Kora silk"],
            ["Rust Ajrakh Drape", "A rich rust-toned drape with Ajrakh-inspired motifs and a coordinated tailored blouse.", 7900, 15, "Printed cotton-silk"],
        ],
    },
    {
        category: "Kurtis & Sets",
        image: imageByCategory.kurtas,
        colors: ["Indigo", "Ivory", "Sage", "Blush", "Sky blue"],
        products: [
            ["Ivory Chikankari Kurta Set", "A soft ivory kurta with delicate Chikankari embroidery, paired with straight pants and a dupatta.", 7200, 14, "Cotton voile"],
            ["Ajrakh Print Cotton Kurta Set", "Hand-block-inspired Ajrakh motifs on breathable cotton, styled as an easy everyday set.", 4800, 12, "Cotton"],
            ["Chanderi Straight Kurta Set", "A polished straight kurta in light Chanderi with a coordinated trouser and dupatta.", 6900, 14, "Chanderi"],
            ["Anarkali Embroidered Kurta Set", "A flowing Anarkali silhouette with fine threadwork for festive gatherings.", 9600, 17, "Silk blend"],
            ["Mul Cotton Everyday Set", "An easy, breathable mul cotton set with a relaxed silhouette and thoughtful finishing.", 3900, 10, "Mul cotton"],
            ["Mirror Work Festive Kurta Set", "A festive kurta set accented with subtle mirror work and a light dupatta.", 8800, 16, "Cotton-silk blend"],
            ["Indigo Handblock Kurta Set", "A timeless indigo print with hand-finished details and a comfortable custom fit.", 5200, 12, "Handblock cotton"],
            ["Silk Blend Palazzo Kurta Set", "A contemporary long kurta and fluid palazzo set with understated metallic detailing.", 7900, 15, "Silk blend"],
            ["Floral Threadwork Kurta Set", "Fine floral threadwork brings a soft, occasion-ready finish to this coordinated set.", 8500, 16, "Viscose silk"],
            ["A-Line Chikankari Kurta Set", "An A-line kurta with airy Chikankari-inspired embroidery and tapered trousers.", 6400, 13, "Cotton"],
            ["Marigold Aari Kurta Set", "A warm marigold kurta set with delicate Aari-inspired detailing for daytime celebrations.", 7600, 14, "Cotton-silk"],
            ["Ink Blue A-Line Kurta Set", "An ink-blue A-line silhouette with a clean neckline, tapered trousers, and a light dupatta.", 5900, 12, "Viscose cotton"],
        ],
    },
    {
        category: "Lehengas",
        image: imageByCategory.lehengas,
        colors: ["Rose gold", "Ruby", "Sage", "Peach", "Champagne"],
        products: [
            ["Rose Gold Bridal Lehenga", "A rose-gold bridal lehenga with layered embroidery and a made-to-measure blouse.", 38500, 30, "Silk and net"],
            ["Mehendi Green Embroidered Lehenga", "A rich green lehenga with fine threadwork, designed for festive celebrations.", 24800, 26, "Raw silk"],
            ["Ruby Zari Lehenga", "A jewel-toned ruby skirt with traditional zari work and a coordinated custom blouse.", 32900, 28, "Banarasi silk"],
            ["Ivory Floral Lehenga", "An ivory lehenga scattered with delicate floral embroidery for a light bridal look.", 29200, 28, "Organza and silk"],
            ["Midnight Blue Velvet Lehenga", "Deep velvet and antique-gold embroidery create a dramatic evening ensemble.", 35800, 30, "Velvet"],
            ["Peach Organza Lehenga", "A soft peach organza lehenga with fine embellishment and a graceful, airy drape.", 21600, 24, "Organza"],
            ["Sage Silk Lehenga", "A muted sage silk lehenga with restrained hand detailing for understated occasions.", 26400, 26, "Silk"],
            ["Marigold Sangeet Lehenga", "A bright marigold lehenga with movement and light embroidery for the dance floor.", 19800, 23, "Georgette"],
            ["Burgundy Banarasi Lehenga", "Burgundy brocade with heirloom-inspired motifs and a blouse fitted to your measurements.", 31200, 28, "Banarasi brocade"],
            ["Champagne Sequin Lehenga", "A champagne-toned lehenga with subtle sequin work and a soft, fluid silhouette.", 27900, 27, "Net and satin"],
            ["Seafoam Threadwork Lehenga", "A soft seafoam lehenga with fine floral threadwork and a made-to-measure blouse.", 23800, 25, "Silk organza"],
            ["Coral Gota Patti Lehenga", "A festive coral lehenga finished with light Gota Patti accents and a graceful flare.", 25700, 26, "Georgette and silk"],
        ],
    },
];

module.exports = collections.flatMap((collection) =>
    collection.products.map(([name, description, basePrice, estimatedDays, fabric]) => ({
        name,
        category: collection.category,
        description,
        basePrice,
        estimatedDays,
        sizingType: "both",
        availableStandardSizes: standardSizes,
        availableColors: collection.colors,
        images: [collection.image],
        isAvailable: true,
        attributes: {
            Fabric: fabric,
            "Fit options": "Standard XS–XXL or custom made-to-measure",
        },
    })),
);

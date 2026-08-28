-- Phase 49: Learn articles for Screeding Guides category (11 articles)
-- Each article includes SEO meta tags and structured content

INSERT INTO learn_articles (slug, title, excerpt, content, category_slug, author, read_time_minutes, status, is_featured, meta_title, meta_description, meta_keywords, published_at, sort_order) VALUES
('complete-guide-wall-screeding-professional',
'Complete Guide to Wall Screeding Like a Professional',
'Learn the complete process of wall screeding from surface preparation to finishing. This guide covers materials, techniques, ratios, and pro tips for flawless screeded walls.',
$ARTICLE$## Why Wall Screeding Matters

Wall screeding is the foundation of every smooth, painted wall. Before paint can go on, the wall surface must be levelled, smoothed, and prepared. Screeding is the process of applying a cement and sand mixture to walls to create a flat, even surface that paint can adhere to. Without proper screeding, even the most expensive paint will look uneven, show imperfections, and fail prematurely.

In Nigerian construction, screeding is especially important because many walls are built with blocks that have irregular surfaces. The mortar joints between blocks create ridges and hollows that must be filled and smoothed. A well-screeded wall transforms a rough block wall into a surface that looks professionally finished.

Whether you are building a new home or renovating an existing one, understanding screeding will save you money and ensure better results. Many homeowners skip screeding or do it poorly, then wonder why their paint looks patchy and their walls develop cracks within months.

## Understanding Screeding Materials

Screeding requires specific materials in the right proportions. Getting this wrong is the most common cause of screeding failure.

**Cement:** Ordinary Portland Cement is the standard choice for screeding. In Nigeria, brands like Dangote, BUA, and Lafarge are widely available and reliable. Cement acts as the binder that holds the sand together and adheres to the wall surface. Always use fresh cement that has not been stored for more than three months. Old cement loses binding strength and will cause the screed to crack and fail.

**Sand:** Sharp sand is the best type for screeding. The angular particles of sharp sand interlock and create a stronger mix than smooth river sand. The sand should be clean and free from clay, silt, and organic matter. Dirty sand is the second most common cause of screeding failure after incorrect ratios. If your sand has clay content, wash it before use or source cleaner sand.

**Water:** Clean water is essential. Water from boreholes or treated municipal supply is fine. Avoid water from stagnant sources or water that contains dissolved salts, as these can cause efflorescence on the finished surface.

**Bonding Agent:** For walls that are very smooth or have been previously painted, a bonding agent improves adhesion. SBR latex bonding agents are the most common and can be mixed into the screed or applied as a primer coat. [Use the screeding calculator](/screeding-calculator) to determine exact material quantities for your project.

## The Cement-Sand Ratio Explained

The correct cement-to-sand ratio is critical. The most common ratio for wall screeding is 1:3 or 1:4 (one part cement to three or four parts sand by volume). A 1:3 ratio produces a stronger mix suitable for exterior walls and high-traffic areas. A 1:4 ratio is adequate for interior walls and provides a smoother finish.

Measuring the ratio by volume is the practical approach on site. Use a standard container, such as a head pan or bucket, to measure each ingredient. Do not eyeball the ratio. Inconsistent ratios across batches lead to colour variations, different setting times, and uneven surfaces.

Mix only as much as you can apply within 30 to 45 minutes. Once mixed with water, cement begins the hydration process and starts setting. Applying partially set screed results in weak adhesion and surface cracking.

## Preparing the Wall Surface

Surface preparation is where most screeding jobs succeed or fail. A dirty or dusty wall will not bond with the screed, no matter how good your mix is.

Start by cleaning the wall thoroughly. Use a wire brush to remove loose particles, dust, and old paint flakes. If the wall has been previously painted, scrape off all loose paint and sand glossy surfaces to create a mechanical key. Wash the wall with water and let it dry.

Next, wet the wall lightly before applying screed. This is called dampening the substrate. A dry wall sucks water out of the screed mix too quickly, causing it to crack and fail. However, do not soak the wall. A lightly damp surface is ideal. In hot Nigerian weather, you may need to wet the wall and wait 10 minutes for the water to be absorbed before starting.

For extremely smooth concrete surfaces, create a mechanical key by hacking the surface lightly with a chisel or applying a bonding slurry before screeding.

## Applying the Screed

The application technique determines the final quality. Work in sections of about 1 to 1.5 square metres at a time.

Start from the bottom of the wall and work upward. Apply the screed using a trowel at an angle of about 30 degrees to the wall. Press firmly to ensure the screed fills all hollows and bonds with the wall surface. The first coat should be about 6 to 10 millimetres thick.

Use a straight edge to level the surface. Place the straightedge against the wall and move it in a sawing motion from bottom to top. This removes excess material and fills low spots. Work the straightedge both vertically and horizontally to ensure the surface is level in all directions.

After levelling, use a wooden or sponge float to smooth the surface. The floating action compacts the surface and closes any small holes. Do not overwork the surface, as this can bring too much cement paste to the top and cause hairline cracks.

## Curing and Drying

Curing is the process of keeping the screed moist so the cement hydrates fully. Proper curing is the difference between a screed that lasts 20 years and one that cracks within weeks.

After the screed has set enough to withstand gentle spraying, begin curing by spraying water on the surface. Do this at least twice a day for the first three days. In hot, dry weather, you may need to cure three times a day.

Continue curing for at least 5 to 7 days. The screed should be fully cured before any painting begins, which typically takes 14 to 21 days depending on weather conditions.

Never paint a screeded wall before it is fully dry. Trapped moisture will cause paint to blister and peel. Test by taping a small piece of clear plastic to the wall. If condensation forms under the plastic after 24 hours, the wall is still too wet to paint.

## Common Screeding Problems and Solutions

**Cracking:** Hairline cracks often result from insufficient curing, too-rich cement mix, or applying the screed too thickly. Fix cracks by widening them slightly with a scraper, cleaning, and filling with a thin slurry of cement and fine sand.

**Hollow Sounding Areas:** If tapping the wall produces a hollow sound, the screed has not bonded with the substrate. Remove the hollow section and re-apply with proper preparation.

**Efflorescence:** White salt deposits on the surface indicate soluble salts in the sand or water. Brush off the deposits after the wall dries and avoid using sand with high salt content in future mixes.

## Conclusion

Wall screeding is a skill that combines the right materials, correct ratios, proper preparation, and careful application. When done correctly, it creates a smooth, durable surface that makes paint look professional and last for years. Take the time to prepare your surfaces, measure your ratios carefully, cure thoroughly, and you will achieve results that rival any professional. Remember that the quality of your screeding determines the quality of everything that comes after it.$ARTICLE$,
'screeding-guides', 'Frelux Editorial Team', 12, 'published', true,
'Complete Guide to Wall Screeding Like a Professional',
'Learn the complete process of wall screeding from preparation to finishing. Covers materials, cement-sand ratios, application techniques, curing, and common problems.',
'wall screeding, screeding guide, cement screed, wall preparation, screeding techniques, screeding materials, Nigerian construction',
now(), 1)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content, author = EXCLUDED.author, read_time_minutes = EXCLUDED.read_time_minutes, status = EXCLUDED.status, is_featured = EXCLUDED.is_featured, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, meta_keywords = EXCLUDED.meta_keywords, published_at = EXCLUDED.published_at, updated_at = now();

INSERT INTO learn_articles (slug, title, excerpt, content, category_slug, author, read_time_minutes, status, is_featured, meta_title, meta_description, meta_keywords, published_at, sort_order) VALUES
('how-to-calculate-screeding-material-quantities',
'How to Calculate Screeding Material Quantities',
'Learn how to accurately calculate cement, sand, and water quantities for wall screeding projects. Step-by-step formulas with practical Nigerian examples.',
$ARTICLE$## Why Accurate Material Calculation Matters

Ordering too little material means stopping mid-project to buy more, which breaks your rhythm and can result in colour variations if the new batch of cement is from a different production run. Ordering too much wastes money and creates storage problems. Accurate calculation ensures you buy exactly what you need, keep costs under control, and finish the job without interruptions.

The calculation method is straightforward once you understand the principles. You need to know the wall area, the screed thickness, and the mix ratio. From these three values, you can calculate the volume of screed required and then break that down into individual material quantities.

## Step 1: Measure the Wall Area

Start by measuring the wall you plan to screed. For a rectangular wall, multiply the height by the width. For example, a wall that is 3 metres high and 5 metres wide has an area of 15 square metres.

If the wall has openings like doors and windows, subtract their area from the total. A standard door is about 0.9 metres by 2.1 metres (1.89 square metres) and a typical window is 1.2 metres by 1.2 metres (1.44 square metres). For a wall with one door and one window: 15 minus 1.89 minus 1.44 equals 11.67 square metres of net screeding area.

For irregular walls, break the area into rectangles and triangles, calculate each separately, and add them together. Always measure in metres for consistency with cement bag sizes.

## Step 2: Determine the Screed Thickness

Wall screed thickness varies depending on the wall condition. For relatively flat block walls, 6 to 10 millimetres is sufficient. For walls with significant irregularities, you may need 12 to 15 millimetres. For the calculation, use 10 millimetres (0.01 metres) as a standard thickness.

The volume of screed is Area multiplied by Thickness. For our example: 11.67 square metres times 0.01 metres equals 0.1167 cubic metres of screed.

## Step 3: Apply the Mix Ratio

For a 1:3 cement-to-sand ratio, cement accounts for one quarter of the dry volume and sand accounts for three quarters. But there is a crucial factor: the dry volume is about 1.3 to 1.5 times the wet volume because mixing adds voids. Use a factor of 1.33 for the calculation.

Dry volume equals 0.1167 times 1.33 equals 0.1552 cubic metres. Cement volume equals 0.1552 times 0.25 equals 0.0388 cubic metres. Sand volume equals 0.1552 times 0.75 equals 0.1164 cubic metres.

## Step 4: Convert to Practical Units

One 50kg bag of cement equals approximately 0.0347 cubic metres. So cement bags equals 0.0388 divided by 0.0347 equals 1.12 bags. Round up to 2 bags.

Sand is sold in tonnes or trips in Nigeria. One cubic metre of sharp sand weighs about 1,600 kg. So sand needed equals 0.1164 times 1,600 equals 186 kg, which is about 0.19 tonnes. In practical terms, one tonne of sand is more than enough for this project.

Water required is roughly 0.5 times the weight of cement. For 2 bags (100 kg of cement), you need about 50 litres of water.

## Step 5: Account for Wastage

Always add 10 to 15 percent for wastage. Material is lost during mixing, transfer, and application. On the wall, some screed falls off and cannot be reused. Adding 15 percent to our cement calculation: 2 bags times 1.15 equals 2.3 bags. Round up to 3 bags to be safe.

For sand: 0.19 tonnes times 1.15 equals 0.22 tonnes. Round up to 0.5 tonnes as the smallest practical purchase quantity in most Nigerian markets.

## Using the FRELUX Screeding Calculator

Manual calculations are useful for understanding the process, but for actual projects, use the [screeding calculator](/screeding-calculator) to automate the computation. Enter your wall dimensions, number of doors and windows, and the desired thickness. The calculator handles the ratios, wastage factors, and converts to practical units like bags of cement and tonnes of sand.

The calculator also provides a cost estimate using current Nigerian market prices, so you know your budget before heading to the market.

## Cost Estimation

With quantities determined, multiply by current market prices. As of 2026 in Nigeria, a bag of cement costs between 7,000 and 9,000 Naira. A tonne of sharp sand costs between 15,000 and 30,000 Naira including delivery.

For our example: 3 bags of cement at 8,000 Naira each equals 24,000 Naira. 0.5 tonnes of sand at 25,000 Naira equals 12,500 Naira. Total material cost: approximately 36,500 Naira for 11.67 square metres of wall.

## Conclusion

Calculating screeding material quantities is a systematic process that anyone can follow. Measure your area, choose your thickness, apply the ratio, convert to practical units, and add wastage allowance. When in doubt, use the online calculator to verify your manual figures. Accurate calculation saves money, prevents delays, and ensures your project runs smoothly from start to finish.$ARTICLE$,
'screeding-guides', 'Frelux Editorial Team', 10, 'published', false,
'How to Calculate Screeding Material Quantities',
'Step by step guide to calculating cement, sand, and water for wall screeding. Includes formulas, wastage factors, and Nigerian market cost estimates.',
'screeding calculation, cement quantity, sand quantity, screed material, screeding cost, material estimation, Nigerian construction',
now(), 2)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content, author = EXCLUDED.author, read_time_minutes = EXCLUDED.read_time_minutes, status = EXCLUDED.status, is_featured = EXCLUDED.is_featured, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, meta_keywords = EXCLUDED.meta_keywords, published_at = EXCLUDED.published_at, updated_at = now();

INSERT INTO learn_articles (slug, title, excerpt, content, category_slug, author, read_time_minutes, status, is_featured, meta_title, meta_description, meta_keywords, published_at, sort_order) VALUES
('cement-sand-ratio-screeding-explained',
'Cement-Sand Ratio for Screeding Explained',
'Understand the correct cement-to-sand ratios for wall screeding and how different ratios affect strength, workability, and finish quality.',
$ARTICLE$## What Is a Cement-Sand Ratio

The cement-sand ratio describes the proportion of cement to sand in a screed mix by volume. For example, a 1:3 ratio means one part cement to three parts sand. This ratio is the single most important factor in screed quality because it determines the strength, workability, and surface finish of the screed.

Cement is the binder that holds everything together. Sand provides the bulk and structural fill. Too much cement makes the mix strong but prone to shrinkage cracking. Too much sand makes the mix easy to work but weak and crumbly. Finding the right balance is essential.

## Common Ratios and Their Uses

**1:3 Ratio (Strong):** One part cement to three parts sand. This produces a strong, dense screed suitable for exterior walls, wet areas like bathrooms and kitchens, and walls that will bear heavy loads. The downside is that it is harder to work with and requires more effort to smooth. This ratio is also more expensive because it uses more cement per unit area.

**1:4 Ratio (Standard):** One part cement to four parts sand. This is the most common ratio for interior wall screeding in Nigeria. It provides adequate strength for painted interior walls, is easy to work with, and produces a smooth surface. Most professional screeders use this ratio as their default for general interior work.

**1:5 Ratio (Economy):** One part cement to five parts sand. This is the weakest common ratio and is only suitable for non-critical applications like temporary walls or areas that will not be painted. Using this ratio for permanent construction is not recommended as the screed will be weak and prone to damage.

**1:2 Ratio (High Strength):** Used rarely for screeding but common for concrete. This ratio is very strong but expensive and difficult to apply as wall screed. Reserve this for special applications like beam filling or repair patches.

## How to Measure the Ratio Correctly

The most common mistake in ratio measurement is using inconsistent containers. If you use a wheelbarrow for the first batch and a head pan for the next, your ratios will be different even if you count the same number of scoops.

Choose one standard container and use it for all measurements. A head pan is the most common measuring unit on Nigerian construction sites. One head pan of cement to three head pans of sand gives you a 1:3 ratio. Use the same head pan for every batch throughout the project.

Measure cement by volume, not by bag. If you need less than a full bag, pour the cement into your measuring container and level it off. Do not pack the cement down, as this changes the volume and skews the ratio.

## Factors That Affect the Ideal Ratio

The ideal ratio depends on several factors beyond just strength requirements. The type of sand matters: sharp sand with angular particles needs slightly less cement than smooth river sand because the particles interlock and provide some structural strength on their own.

The wall surface also matters. Rough, porous block walls absorb more cement paste and may need a slightly richer mix (1:3 instead of 1:4). Smooth concrete walls need a bonding agent regardless of the ratio.

Weather conditions affect the ratio too. In hot, dry weather, a slightly wetter mix helps compensate for rapid evaporation. In humid conditions, a drier mix prevents the screed from sagging on the wall.

## Signs of an Incorrect Ratio

**Too Much Cement (Rich Mix):** The screed develops hairline cracks within days of application. The surface may show a crazing pattern. The screed feels very hard and brittle. While strong, it is prone to cracking and is unnecessarily expensive.

**Too Much Sand (Lean Mix):** The screed is weak and can be scratched easily with a fingernail. It may dust off when rubbed. The surface is prone to erosion and does not provide a good base for paint. Paint applied to a lean mix will flake and peel.

**Inconsistent Mixes:** If different batches have different ratios, the wall will show colour variations, different drying rates, and uneven surfaces. This is the result of not using consistent measuring containers.

## Practical Tips for Mixing

Mix dry materials first. Turn the cement and sand together at least three times until the colour is uniform. Only then add water gradually while continuing to mix. Adding water all at once creates a lumpy mix that is difficult to apply.

The right consistency is like thick paste. If you scoop some on a trowel and tilt it, the screed should slide off slowly, not run off like liquid or stick completely. Use the [screeding calculator](/screeding-calculator) to determine the right quantities based on your chosen ratio.

## Conclusion

The cement-sand ratio is the backbone of quality screeding. A 1:4 ratio works for most interior walls, while 1:3 is better for exterior and wet areas. Always measure with the same container, mix dry before adding water, and aim for a paste-like consistency. Getting the ratio right means your screed will be strong, smooth, and durable for years to come.$ARTICLE$,
'screeding-guides', 'Frelux Editorial Team', 10, 'published', false,
'Cement-Sand Ratio for Screeding Explained',
'Understand correct cement to sand ratios for screeding. Learn how ratios affect strength, workability, and finish quality with practical tips.',
'cement sand ratio, screeding mix, screed strength, cement ratio, sand ratio, screeding mix design, construction materials',
now(), 3)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content, author = EXCLUDED.author, read_time_minutes = EXCLUDED.read_time_minutes, status = EXCLUDED.status, is_featured = EXCLUDED.is_featured, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, meta_keywords = EXCLUDED.meta_keywords, published_at = EXCLUDED.published_at, updated_at = now();

INSERT INTO learn_articles (slug, title, excerpt, content, category_slug, author, read_time_minutes, status, is_featured, meta_title, meta_description, meta_keywords, published_at, sort_order) VALUES
('common-screeding-mistakes-how-to-avoid',
'Common Screeding Mistakes and How to Avoid Them',
'Identify the most common screeding mistakes that cause cracks, hollow areas, and poor finishes. Learn practical solutions to avoid these costly errors.',
$ARTICLE$## The Cost of Screeding Mistakes

Screeding mistakes are expensive. They show up after painting is complete, which means you have to remove paint, fix the screed, and repaint. In the worst cases, the entire wall surface must be stripped and re-screeded from scratch. Understanding the common mistakes before you start saves time, money, and frustration.

Most screeding problems fall into three categories: poor surface preparation, incorrect mixing, and improper application technique.

## Mistake 1: Not Preparing the Surface

This is the number one cause of screeding failure. Applying screed to a dusty, dirty, or loose surface guarantees poor adhesion. The screed will sound hollow when tapped and eventually fall off in patches.

**The Fix:** Clean the wall thoroughly with a wire brush to remove all loose particles. Wash with water if necessary. For painted walls, scrape off all loose paint. Dampen the wall lightly before applying screed. For very smooth surfaces, apply a bonding agent or create a mechanical key by hacking the surface.

## Mistake 2: Wrong Cement-Sand Ratio

Using too much sand makes the screed weak and crumbly. Using too much cement makes it prone to cracking. Inconsistent ratios across batches create uneven surfaces and colour variations.

**The Fix:** Choose one ratio (1:4 for interiors, 1:3 for exteriors) and stick with it. Use the same measuring container for every batch. Count the scoops carefully. If you are using bag cement, open a fresh bag and measure by volume, not by estimation.

## Mistake 3: Applying Screed Too Thick

A common belief is that thicker screed is stronger. This is wrong. Screed thicker than 15 millimetres is prone to cracking and sagging. The weight of thick screed pulls it away from the wall before it sets.

**The Fix:** Apply screed in layers of 6 to 10 millimetres. If the wall needs more thickness, apply two thin coats rather than one thick one. Let the first coat set for 24 hours before applying the second. Use a straightedge to check thickness as you work.

## Mistake 4: Not Curing the Screed

Curing is often skipped to save time, but it is essential for strength development. Uncured screed is weak, dusty, and prone to cracking. The cement does not fully hydrate without adequate moisture.

**The Fix:** Begin curing 6 to 12 hours after application. Spray water on the wall at least twice daily for 5 to 7 days. In hot weather, cover the wall with wet sacks or plastic sheeting to retain moisture. Never skip curing, no matter how tight the project timeline.

## Mistake 5: Mixing Too Much at Once

Mixing a large batch of screed means some of it will begin setting before you can apply it. Partially set screed has poor adhesion and creates weak spots in the wall.

**The Fix:** Mix only what you can apply within 30 to 45 minutes. In hot weather, reduce this to 20 minutes. Use the [screeding calculator](/screeding-calculator) to plan batch sizes based on your wall area.

## Mistake 6: Ignoring Weather Conditions

Applying screed in direct hot sunlight causes rapid evaporation, leading to cracking. Working in heavy rain washes away the mix before it sets. Both extremes compromise quality.

**The Fix:** Schedule screeding for early morning or late afternoon during hot weather. Provide shade if necessary. Do not screed during rain. In very hot conditions, work in smaller sections and cure more frequently.

## Mistake 7: Using Dirty Sand

Sand containing clay, silt, or organic matter weakens the screed and causes surface defects. Clay shrinks when it dries, creating cracks. Organic matter prevents proper cement hydration.

**The Fix:** Source sand from reputable suppliers. Test sand by placing a handful in a clear bottle with water, shaking, and letting it settle. If the water remains cloudy after 30 minutes, the sand has too much silt or clay. Wash the sand or find a cleaner source.

## Mistake 8: Overworking the Surface

Continuously trowelling the surface after it has begun to set brings cement paste to the top and creates a weak surface layer. This layer dusts off when rubbed and does not hold paint well.

**The Fix:** Finish floating and trowelling before the screed begins to set. Once the surface starts losing its wet sheen, stop working it. If you need to smooth a section, do it while the screed is still fresh.

## Conclusion

Screeding mistakes are preventable with proper preparation and attention to detail. Clean the surface, measure ratios accurately, apply thin layers, cure thoroughly, mix small batches, respect the weather, use clean sand, and finish before the screed sets. Following these guidelines will help you achieve a professional-quality screed that provides a perfect base for paint and lasts for decades.$ARTICLE$,
'screeding-guides', 'Frelux Editorial Team', 10, 'published', false,
'Common Screeding Mistakes and How to Avoid Them',
'Learn the most common wall screeding mistakes that cause cracks, hollow areas, and poor finishes, with practical solutions to prevent costly errors.',
'screeding mistakes, screeding problems, wall cracks, screed failure, poor adhesion, construction errors, screeding tips',
now(), 4)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content, author = EXCLUDED.author, read_time_minutes = EXCLUDED.read_time_minutes, status = EXCLUDED.status, is_featured = EXCLUDED.is_featured, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, meta_keywords = EXCLUDED.meta_keywords, published_at = EXCLUDED.published_at, updated_at = now();

INSERT INTO learn_articles (slug, title, excerpt, content, category_slug, author, read_time_minutes, status, is_featured, meta_title, meta_description, meta_keywords, published_at, sort_order) VALUES
('screeding-vs-plastering-key-differences',
'Screeding vs Plastering: Key Differences Explained',
'Understand the differences between screeding and plastering, when to use each technique, and how they affect your wall finishing results.',
$ARTICLE$## Understanding the Terminology

In Nigerian construction, the terms screeding and plastering are often used interchangeably, but they refer to different processes with different purposes. Understanding the distinction helps you communicate clearly with your builder and choose the right technique for each surface.

Plastering is the process of applying a cement-based coating to a wall to protect it and provide a surface suitable for finishing. It is typically applied in thicker layers and serves as both a protective and smoothing layer. Screeding, on the other hand, is a finer, thinner application specifically designed to create a smooth surface for paint.

## Purpose and Function

**Plastering** serves multiple purposes. It protects the wall from weather damage, fills large gaps and irregularities in the block work, and provides a base for further finishing. Plastering is typically 12 to 20 millimetres thick and uses a coarser mix. It is the workhorse layer that makes a rough block wall into a flat, stable surface.

**Screeding** is a finishing technique. It is applied over plaster (or directly on smooth walls) to create a paint-ready surface. Screeding is thin, typically 3 to 10 millimetres, and uses a finer mix with smaller sand particles. The goal of screeding is smoothness, not structural protection.

In most Nigerian construction projects, plastering is done first, followed by screeding, and then painting. Some modern projects skip separate screeding and use a high-quality plaster with a smooth finish, but the two-stage approach generally produces better results.

## Material Differences

**Plaster Mix:** Typically 1:5 or 1:6 cement-to-sand ratio with coarse sand. The coarser sand provides bulk and fills larger voids. The mix is stiffer and can be applied in thicker layers without sagging. Plaster may also include additives for water resistance in exterior applications.

**Screed Mix:** Typically 1:3 or 1:4 ratio with fine sand. The finer sand produces a smoother surface. The mix is wetter and more workable than plaster. Some screed mixes include bonding agents for better adhesion to the plaster surface.

## Application Techniques

**Plastering** uses a hawk and trowel. The plasterer applies the mix in sweeping motions, building up the layer to the desired thickness. A straightedge is used to level the surface, and a wooden float smooths it. The surface is left slightly rough to provide a key for the screed layer.

**Screeding** uses a trowel and float with finer control. The screed is applied in thin layers and smoothed to a fine finish. A sponge float may be used for the final pass to create an ultra-smooth surface. The technique requires more precision than plastering because the thin layer shows every trowel mark.

## When to Use Each

Use **plastering** when building new block walls, repairing damaged walls, for exterior wall protection, or creating a base layer on rough surfaces. Plastering is always the first layer on newly built block walls.

Use **screeding** when preparing a plastered wall for paint, smoothing an existing but rough surface, or creating a fine finish on interior walls. Screeding is the final layer before painting.

In some cases, you may only need screeding. If you have a concrete wall that is already flat but slightly rough, you can screed directly without plastering. Use the [screeding calculator](/screeding-calculator) to estimate materials for either approach.

## Cost Comparison

Plastering costs more per square metre because it uses more material and labour. In Nigeria, plastering typically costs between 800 and 1,500 Naira per square metre including materials and labour. Screeding costs between 500 and 1,000 Naira per square metre.

The two-stage approach (plaster then screed) costs between 1,300 and 2,500 Naira per square metre but produces the best results. For budget projects, a good plaster with a smooth finish may eliminate the need for separate screeding.

## Conclusion

Plastering and screeding are complementary processes, not competing ones. Plastering provides the structural layer that protects and levels the wall. Screeding provides the fine finish that makes the wall ready for paint. Understanding the difference helps you plan your project correctly, budget accurately, and communicate effectively with your construction team. For the best results, plaster first, then screed, then paint.$ARTICLE$,
'screeding-guides', 'Frelux Editorial Team', 10, 'published', false,
'Screeding vs Plastering: Key Differences',
'Learn the differences between screeding and plastering, when to use each technique, and how they affect your wall finishing results and costs.',
'screeding vs plastering, wall finishing, plaster, screed, wall preparation, construction techniques, Nigerian building',
now(), 5)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content, author = EXCLUDED.author, read_time_minutes = EXCLUDED.read_time_minutes, status = EXCLUDED.status, is_featured = EXCLUDED.is_featured, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, meta_keywords = EXCLUDED.meta_keywords, published_at = EXCLUDED.published_at, updated_at = now();

INSERT INTO learn_articles (slug, title, excerpt, content, category_slug, author, read_time_minutes, status, is_featured, meta_title, meta_description, meta_keywords, published_at, sort_order) VALUES
('how-to-prepare-walls-for-screeding',
'How to Prepare Walls for Screeding Properly',
'Learn the essential steps for preparing walls before screeding, including cleaning, dampening, hacking, and applying bonding agents.',
$ARTICLE$## Why Preparation Is 80 Percent of the Job

The quality of your screeding is determined largely by what happens before any screed touches the wall. Poor preparation is the single most common cause of screeding failure. No matter how good your mix is, if the wall surface is dirty, dry, or smooth, the screed will not bond properly and will eventually fail.

Professional screeders spend more time preparing the surface than applying the screed. This guide walks you through every step of wall preparation, from initial cleaning to the final dampening before application.

## Step 1: Inspect the Wall

Before doing anything, inspect the wall carefully. Look for cracks, loose blocks, damaged areas, and existing coatings. Each condition requires different preparation.

For new block walls, check that the mortar joints are fully cured (at least 7 days old). For existing walls, identify what is on the surface: bare block, old screed, paint, or wallpaper. Each requires different removal and preparation methods.

Mark any areas that need repair with chalk or a marker. Cracks wider than 2 millimetres should be filled with a cement-based repair mortar before screeding begins. Loose or damaged blocks should be replaced or repaired.

## Step 2: Clean the Surface

Start by removing all loose material. Use a wire brush to scrub the wall surface, paying attention to mortar joints where debris accumulates. Brush in all directions to dislodge all loose particles.

If the wall has been previously painted, assess the paint condition. Paint that is firmly bonded can remain, but loose, flaking, or blistering paint must be removed. Use a paint scraper or angle grinder with a wire cup brush for stubborn paint.

For walls with oil stains or grease (common in kitchen areas), use a degreasing agent or TSP substitute. Oil prevents cement from bonding and must be completely removed.

After mechanical cleaning, wash the wall with clean water. Use a sponge or spray bottle to wet the surface and wipe away fine dust. Let the wall dry partially before moving to the next step.

## Step 3: Remove Protrusions and Fill Holes

Check the wall for protrusions. Mortar that has squeezed out of joints should be chiselled off flush with the wall surface. Any nails, screws, or foreign objects should be removed.

Fill any holes or deep hollows with a stiff mortar mix before screeding. Small holes (less than 5 mm deep) can be filled during the screeding process. Larger holes should be pre-filled and allowed to set for 24 hours.

For walls with very uneven surfaces (where the difference between high and low points exceeds 15 mm), consider plastering first and then screeding. Screeding is for smoothing, not for major levelling.

## Step 4: Create a Mechanical Key

Smooth surfaces like concrete or previously screeded walls need a mechanical key for the new screed to bond. Without this key, the screed will slide off or sound hollow.

For concrete surfaces, use a cold chisel and hammer to create a pattern of light hacks across the surface. Do not hack deeply; the goal is to create texture, not to damage the concrete. Space the hacks about 2 to 3 centimetres apart.

After hacking, brush away all dust created by the process. The surface should be rough to the touch but clean.

## Step 5: Apply a Bonding Agent

For smooth surfaces, old concrete, or walls that have been previously screeded, a bonding agent dramatically improves adhesion. SBR latex bonding agents are the most common and effective.

Apply the bonding agent as a slurry coat. Mix one part bonding agent with one part cement and enough water to create a paint-like consistency. Brush this slurry onto the wall with a large brush immediately before screeding.

The slurry coat should be applied to areas you will screed within the next 30 minutes. Do not let the slurry dry before screeding. Work in sections, applying slurry and then screed over it while both are wet. [Calculate your material needs](/screeding-calculator) before starting.

## Step 6: Dampen the Wall

The final step before screeding is to dampen the wall. Use a spray bottle or brush to apply a light coat of clean water to the surface. The wall should be damp but not dripping wet.

Dampening prevents the dry wall from sucking water out of the screed mix too quickly. Rapid water loss causes the cement to hydrate improperly, resulting in weak screed and surface cracking.

In hot Nigerian weather, you may need to dampen the wall and wait 10 to 15 minutes for the water to be absorbed, then dampen again before screeding.

## Conclusion

Wall preparation is the foundation of successful screeding. Inspect, clean, remove protrusions, create a mechanical key, apply bonding agent, and dampen the surface. Each step builds on the previous one to create the ideal conditions for screed adhesion. Skip any step and you risk screeding failure that will cost more to fix than to do right the first time.$ARTICLE$,
'screeding-guides', 'Frelux Editorial Team', 10, 'published', false,
'How to Prepare Walls for Screeding Properly',
'Essential steps for preparing walls before screeding including cleaning, dampening, hacking, and applying bonding agents for best adhesion.',
'wall preparation, screeding prep, surface preparation, bonding agent, wall cleaning, mechanical key, construction preparation',
now(), 6)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content, author = EXCLUDED.author, read_time_minutes = EXCLUDED.read_time_minutes, status = EXCLUDED.status, is_featured = EXCLUDED.is_featured, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, meta_keywords = EXCLUDED.meta_keywords, published_at = EXCLUDED.published_at, updated_at = now();

INSERT INTO learn_articles (slug, title, excerpt, content, category_slug, author, read_time_minutes, status, is_featured, meta_title, meta_description, meta_keywords, published_at, sort_order) VALUES
('best-bonding-agents-wall-screeding',
'Best Bonding Agents for Wall Screeding',
'Compare the best bonding agents for wall screeding, including SBR latex, PVA, and acrylic bonding agents. Learn which to use for each surface type.',
$ARTICLE$## What Bonding Agents Do

Bonding agents are chemical additives that improve the adhesion between a new screed layer and an existing wall surface. They work by creating a chemical bond between the old surface and the new material, supplementing the mechanical bond created by surface preparation.

Without a bonding agent, screed relies entirely on mechanical adhesion. On rough, porous surfaces like new block walls, this is usually sufficient. On smooth surfaces like concrete, old screed, or painted walls, a bonding agent is essential for reliable adhesion.

## Types of Bonding Agents

**SBR Latex (Styrene-Butadiene Rubber):** The most common and versatile bonding agent for screeding. SBR latex is a white liquid that is mixed with cement to create a bonding slurry or added directly to the screed mix. It improves adhesion, flexibility, and water resistance. SBR is widely available in Nigeria and is the recommended choice for most screeding projects.

Brands like SikaLatex, Evabond, and local SBR products are available at building material shops across Nigeria. SBR is suitable for both interior and exterior applications and can be used on concrete, block, and previously screeded surfaces.

**PVA (Polyvinyl Acetate):** A cheaper alternative to SBR latex. PVA improves adhesion on porous surfaces but is not water resistant. PVA should only be used for interior applications and never in wet areas like bathrooms or kitchens. PVA can break down when exposed to moisture, causing the screed to fail.

**Acrylic Bonding Agents:** Similar to SBR but with different chemical properties. Acrylic bonding agents provide excellent UV resistance and are ideal for exterior applications. They are less common in Nigeria than SBR but are worth seeking for exterior screeding projects.

**Epoxy Bonding Agents:** The strongest and most expensive option. Epoxy creates an extremely strong bond and is used for critical applications like screeding over tiles, glass, or very smooth concrete. Epoxy is expensive and requires careful mixing of two components. It is overkill for most residential screeding.

## How to Apply Bonding Agents

There are two methods for using bonding agents: as a primer coat (slurry) or as an admixture (mixed into the screed).

**Slurry Method:** Mix one part bonding agent with one part cement and enough water to create a paint-like consistency. Brush this slurry onto the wall surface immediately before applying screed. The slurry creates a tacky surface that the screed bonds to. This is the recommended method for most applications.

Apply the slurry to small sections at a time, about 1 square metre. Screed over the wet slurry immediately. Do not let the slurry dry before screeding.

**Admixture Method:** Replace part of the mixing water with bonding agent. Typically, use one part bonding agent to three or four parts water. This method strengthens the entire screed layer, not just the interface.

For critical applications, use both methods: slurry coat the wall and add bonding agent to the mix.

## Which Bonding Agent for Which Surface

**New Block Walls:** SBR latex slurry coat. The rough surface of blocks provides good mechanical key, and the SBR slurry enhances the bond.

**Smooth Concrete:** SBR latex slurry coat plus SBR in the mix. Concrete is smooth and needs both the slurry and the admixture for reliable bonding.

**Old Screed or Plaster:** SBR latex slurry coat. Clean the old surface thoroughly and hack it before applying the slurry.

**Painted Walls:** Remove all loose paint first. Apply SBR latex slurry coat. If the remaining paint is very firmly bonded, you may need to scarify the surface.

**Exterior Walls:** Acrylic bonding agent for UV resistance, or SBR latex with a water-resistant additive. [Use the calculator](/screeding-calculator) to plan material quantities.

## Conclusion

Bonding agents are the difference between screed that lasts and screed that falls off. For most projects, SBR latex is the best choice: it is versatile, water resistant, and widely available in Nigeria. Use the slurry method for general applications and add SBR to the mix for critical areas. Avoid PVA for wet or exterior applications. Choose the right bonding agent for your surface and you will never deal with falling screed.$ARTICLE$,
'screeding-guides', 'Frelux Editorial Team', 10, 'published', false,
'Best Bonding Agents for Wall Screeding',
'Compare SBR latex, PVA, acrylic, and epoxy bonding agents for wall screeding. Learn which to use for each surface type and application method.',
'bonding agent, SBR latex, PVA, screeding adhesion, bonding slurry, construction chemicals, screed bonding',
now(), 7)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content, author = EXCLUDED.author, read_time_minutes = EXCLUDED.read_time_minutes, status = EXCLUDED.status, is_featured = EXCLUDED.is_featured, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, meta_keywords = EXCLUDED.meta_keywords, published_at = EXCLUDED.published_at, updated_at = now();

INSERT INTO learn_articles (slug, title, excerpt, content, category_slug, author, read_time_minutes, status, is_featured, meta_title, meta_description, meta_keywords, published_at, sort_order) VALUES
('screeding-exterior-walls-tips-techniques',
'Screeding Exterior Walls: Tips and Techniques',
'Learn how to screed exterior walls with weather-resistant techniques, proper curing, and material selection for long-lasting outdoor finishes.',
$ARTICLE$## Challenges of Exterior Screeding

Exterior walls face harsher conditions than interior walls. They are exposed to sunlight, rain, temperature changes, and humidity. Screed on exterior walls must withstand thermal expansion and contraction, water penetration, and UV degradation. These challenges require different techniques and materials than interior screeding.

In Nigeria, the climate adds additional challenges. Intense heat causes rapid evaporation during application. Heavy rains during the wet season test the water resistance of the screed. Harmattan winds bring dust that can affect surface quality if the screed is still fresh.

## Choosing the Right Mix for Exterior Walls

Exterior screed needs to be stronger and more water-resistant than interior screed. Use a 1:3 cement-to-sand ratio for exterior walls. The higher cement content provides greater strength and water resistance.

Consider adding a water-resistant additive to the mix. SBR latex added to the mix at the rate of 5 to 10 percent of the cement weight improves water resistance and flexibility. This helps the screed withstand thermal movement without cracking.

Use sharp sand for exterior screed. The angular particles create a denser, more durable surface. Sieve the sand through a 5mm mesh to remove any oversized particles that would create weak spots.

## Timing the Application

Timing is critical for exterior screeding. Avoid working during the hottest part of the day (11 AM to 3 PM). The heat causes rapid evaporation, which leads to cracking and weak screed.

The best time to screed exterior walls is early morning (6 AM to 10 AM) or late afternoon (4 PM to 6 PM). The cooler temperatures give you more working time and reduce the risk of rapid drying.

Check the weather forecast before starting. Do not screed if rain is expected within 24 hours. Rain on fresh screed washes away the cement paste and ruins the surface. If unexpected rain starts, cover the wall immediately with plastic sheeting.

During harmattan season, the dry wind accelerates evaporation even in cool temperatures. Provide wind breaks or work in smaller sections, covering each section with plastic as soon as you finish.

## Application Technique for Exterior Walls

Apply exterior screed in the same manner as interior screed, but with extra attention to thickness and compaction. The screed should be 8 to 12 millimetres thick. Thinner screed is more vulnerable to weather damage.

Use a wooden float to compact the surface thoroughly. Compaction removes air voids that would otherwise allow water penetration. The surface should be dense and hard when finished.

For exterior walls, consider a rougher finish rather than the glass-smooth finish used indoors. A lightly textured surface hides minor imperfections and provides a better key for exterior paint.

Work in sections of about 2 square metres. Complete each section before moving to the next. This ensures consistent quality and prevents cold joints.

## Extended Curing for Exterior Walls

Exterior screed requires longer curing than interior screed. The exposure to sun and wind means the screed dries faster and needs more moisture to cure properly.

Begin curing as soon as the screed has set enough to resist damage from light water spray. This is usually 4 to 6 hours after application. Spray water gently using a fine nozzle.

Cure exterior screed for at least 7 days. Spray water three times per day: morning, afternoon, and evening. During extremely hot weather, you may need to cure four times per day.

Covering the wall with wet burlap sacks is the most effective curing method for exterior walls. The sacks retain moisture and also protect the surface from direct sunlight.

After curing, let the wall dry completely before painting. This may take 14 to 28 days for exterior walls, depending on weather conditions.

## Weatherproofing After Screeding

Even well-cured exterior screed benefits from additional weatherproofing. Apply a coat of exterior primer before painting. The primer seals the surface and provides an additional moisture barrier.

Choose exterior-grade paint that is designed for masonry surfaces. These paints are formulated to withstand UV exposure and allow the wall to breathe, preventing moisture from being trapped.

Consider applying a transparent water repellent treatment after painting. Silicone-based water repellents penetrate the surface and prevent water absorption. [Calculate your screeding costs](/screeding-calculator) before starting.

## Conclusion

Exterior screeding requires more care than interior work, but the principles are the same: prepare the surface, use the right mix, apply correctly, and cure thoroughly. The extra effort of using a stronger mix, weather-resistant additives, extended curing, and protective coatings pays off in screed that lasts for decades despite harsh weather conditions.$ARTICLE$,
'screeding-guides', 'Frelux Editorial Team', 10, 'published', false,
'Screeding Exterior Walls: Tips and Techniques',
'Learn how to screed exterior walls with weather-resistant techniques, proper curing, and material selection for long-lasting outdoor finishes.',
'exterior screeding, outdoor screeding, weather resistant screed, exterior wall finishing, construction techniques, Nigerian building',
now(), 8)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content, author = EXCLUDED.author, read_time_minutes = EXCLUDED.read_time_minutes, status = EXCLUDED.status, is_featured = EXCLUDED.is_featured, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, meta_keywords = EXCLUDED.meta_keywords, published_at = EXCLUDED.published_at, updated_at = now();

INSERT INTO learn_articles (slug, title, excerpt, content, category_slug, author, read_time_minutes, status, is_featured, meta_title, meta_description, meta_keywords, published_at, sort_order) VALUES
('how-to-estimate-screeding-costs-nigeria',
'How to Estimate Screeding Costs in Nigeria',
'Complete guide to estimating screeding costs in Nigeria including material prices, labour rates, and total project budgeting.',
$ARTICLE$## Understanding Screeding Cost Components

Screeding costs in Nigeria have three main components: materials, labour, and overhead. Understanding each component helps you budget accurately and avoid cost overruns. Many homeowners underestimate screeding costs because they only consider cement and sand, forgetting about bonding agents, water, transportation, and the labour required for proper application.

A realistic cost estimate considers all materials, the labour to mix and apply the screed, the cost of water and electricity on site, transportation of materials, and a contingency fund for wastage and unexpected expenses.

## Material Costs

**Cement:** As of 2026, a 50kg bag of cement costs between 7,000 and 9,000 Naira depending on brand and location. Dangote and BUA cement are at the lower end. For a standard 1:4 mix, you need approximately 1 bag of cement per 5 square metres of wall area.

**Sand:** Sharp sand is sold by the tonne or by the trip. A tonne of sharp sand costs between 15,000 and 30,000 Naira including delivery. For a 1:4 mix at 10mm thickness, you need approximately 0.15 tonnes of sand per square metre.

**Bonding Agent:** SBR latex bonding agent costs between 8,000 and 15,000 Naira per 5-litre container. One container covers approximately 20 to 30 square metres when used as a slurry coat.

**Water:** If you do not have a borehole, a truck of water costs 5,000 to 10,000 Naira.

## Labour Costs

Labour for screeding is charged per square metre in Nigeria. The rate varies by location and the skill level of the workers.

**Basic Screeding:** 300 to 500 Naira per square metre. This covers mixing, application, and basic finishing.

**Professional Screeding:** 500 to 800 Naira per square metre. This includes surface preparation, bonding agent application, precision application, and smooth finishing.

**Premium Screeding:** 800 to 1,200 Naira per square metre. This is for high-end residential and commercial projects where the surface must be flawless.

## Calculating Total Cost per Square Metre

For a standard interior wall using a 1:4 mix with SBR bonding agent:

- Cement: 1 bag per 5 sqm equals 8,000 divided by 5 equals 1,600 Naira per sqm
- Sand: approximately 750 Naira per sqm
- Bonding agent: 500 Naira per sqm
- Water and overhead: 200 Naira per sqm
- Labour (professional): 600 Naira per sqm
- **Total: approximately 3,650 Naira per square metre**

For a 3m by 4m room (walls only, 4 walls, 3m high, minus one door and one window): approximately 33 square metres of wall area. Total cost: 33 times 3,650 equals approximately 120,450 Naira.

## Hidden Costs to Consider

**Scaffolding:** For walls taller than 3 metres, scaffolding rental adds 5,000 to 10,000 Naira per day.

**Transportation:** Delivering materials to the site costs 10,000 to 25,000 Naira depending on distance.

**Wastage:** Add 10 to 15 percent to material costs for wastage during mixing and application.

**Surface Preparation:** If the wall needs hacking, cleaning, or repairs before screeding, add 200 to 400 Naira per square metre.

## Cost-Saving Tips

Buy cement in bulk for a 5 to 10 percent discount. Source sand directly from a quarry rather than through a middleman. Do surface preparation yourself to save on labour. Schedule the project during dry season to avoid rain delays.

Use the [screeding calculator](/screeding-calculator) to get an instant cost estimate based on current Nigerian market prices. The calculator accounts for all material components and provides a total project cost.

## Conclusion

Estimating screeding costs requires considering all materials, labour, and overhead, not just cement and sand. A realistic budget of 3,500 to 4,000 Naira per square metre covers professional-quality screeding with bonding agents and proper curing. Always add 15 percent for contingencies, and use the online calculator to verify your manual estimates.$ARTICLE$,
'screeding-guides', 'Frelux Editorial Team', 10, 'published', false,
'How to Estimate Screeding Costs in Nigeria',
'Complete guide to estimating screeding costs in Nigeria including current material prices, labour rates, and total project budgeting tips.',
'screeding cost, Nigerian construction costs, cement price, sand price, screeding budget, construction estimate, material costs Nigeria',
now(), 9)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content, author = EXCLUDED.author, read_time_minutes = EXCLUDED.read_time_minutes, status = EXCLUDED.status, is_featured = EXCLUDED.is_featured, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, meta_keywords = EXCLUDED.meta_keywords, published_at = EXCLUDED.published_at, updated_at = now();

INSERT INTO learn_articles (slug, title, excerpt, content, category_slug, author, read_time_minutes, status, is_featured, meta_title, meta_description, meta_keywords, published_at, sort_order) VALUES
('screeding-tools-equipment-guide',
'Screeding Tools and Equipment Guide',
'Complete guide to screeding tools and equipment, from trowels and straightedges to floats and mixing equipment. Learn what you need for quality work.',
$ARTICLE$## Essential Tools for Quality Screeding

Quality screeding requires the right tools. Using the wrong tools or cheap substitutes leads to poor results, even with the right materials and technique. This guide covers every tool you need for professional-quality screeding.

## Trowels

The trowel is the primary tool for applying screed to the wall. A pointing trowel (100 to 150mm) is used for mixing and small area work. A plastering trowel (200 to 300mm) is used for applying screed to the wall surface.

Choose a trowel with a comfortable handle and a blade that is flat and true. Stainless steel blades are better than carbon steel because they do not rust and provide a smoother finish.

The trowel should be kept clean. Cement build-up on the blade creates drag and leaves marks on the surface. Clean the trowel with a sponge and water after each batch.

## Straightedges

A straightedge is used to level the screed surface. It is a long, straight piece of aluminium or wood that is moved across the wall to remove high spots and fill low areas.

Aluminium straightedges are preferred because they are lightweight, do not warp, and are easy to clean. A 1.5 to 2 metre straightedge is suitable for most wall work.

Check the straightedge for accuracy before buying. Place it on a flat surface and look for light underneath. A warped straightedge will create an uneven surface.

## Floats

Floats are used to smooth and compact the screed surface after levelling. There are three main types:

**Wooden Float:** Made from hardwood with a flat surface. The wooden float is used for the initial smoothing pass. Use the wooden float in circular motions to compact the surface and close small holes.

**Sponge Float:** A float with a dense sponge surface. The sponge float is used for the final finishing pass. It creates a smooth surface without the trowel marks that metal floats leave. The sponge float is the secret to a professional finish.

**Metal Float:** A flat metal trowel used for the final polishing pass on very smooth finishes. Use the metal float only for the final pass, as overuse brings too much cement paste to the surface.

## Mixing Equipment

**Wheelbarrow:** A wheelbarrow is the most common mixing container on Nigerian sites. A heavy-duty wheelbarrow holds enough screed for about 3 to 4 square metres of wall.

**Mixing Board:** A flat board (about 1m by 1m) placed on the ground for mixing. The board prevents cement from being lost into the soil.

**Mechanical Mixer:** For larger projects, a small concrete mixer saves significant labour. A mixer produces more consistent batches and reduces fatigue. Hire a mixer for 5,000 to 10,000 Naira per day.

**Bucket and Head Pan:** Standard measuring containers. Use a head pan to measure sand and a smaller container for cement. Using the same containers for every batch ensures consistent ratios.

## Measuring and Checking Tools

**Spirit Level:** A 600mm to 1200mm spirit level checks that the wall surface is plumb and level. Place the spirit level on the screeded wall periodically to check for high and low spots.

**Tape Measure:** A 5 metre tape measure for measuring wall dimensions and checking screed thickness. Use the tape measure with the [screeding calculator](/screeding-calculator) to plan material quantities.

**Thickness Gauge:** A simple wire or metal strip of the desired screed thickness (typically 10mm). Hold the gauge against the wall to check that the screed is the correct thickness.

## Safety Equipment

**Gloves:** Cement is alkaline and causes skin irritation with prolonged contact. Wear rubber or nitrile gloves when handling cement and screed.

**Safety Glasses:** Protect your eyes from splashing screed and dust during mixing.

**Boots:** Sturdy boots protect your feet from dropped tools and materials.

**Dust Mask:** Wear a dust mask when mixing dry cement to avoid inhaling cement dust.

## Conclusion

The right tools make screeding faster, easier, and produce better results. Start with the essentials: a quality trowel, a straight straightedge, wooden and sponge floats, and proper measuring containers. Add safety equipment from day one. For larger projects, consider hiring a mechanical mixer. Quality tools are an investment that pays for itself in better results and less wasted material.$ARTICLE$,
'screeding-guides', 'Frelux Editorial Team', 10, 'published', false,
'Screeding Tools and Equipment Guide',
'Complete guide to screeding tools including trowels, straightedges, floats, mixing equipment, and safety gear for professional quality work.',
'screeding tools, trowel, straightedge, plastering float, construction tools, screeding equipment, building tools',
now(), 10)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content, author = EXCLUDED.author, read_time_minutes = EXCLUDED.read_time_minutes, status = EXCLUDED.status, is_featured = EXCLUDED.is_featured, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, meta_keywords = EXCLUDED.meta_keywords, published_at = EXCLUDED.published_at, updated_at = now();

INSERT INTO learn_articles (slug, title, excerpt, content, category_slug, author, read_time_minutes, status, is_featured, meta_title, meta_description, meta_keywords, published_at, sort_order) VALUES
('curing-drying-times-screeded-walls',
'Curing and Drying Times for Screeded Walls',
'Understand the critical difference between curing and drying, proper curing techniques, and when it is safe to paint screeded walls.',
$ARTICLE$## Curing vs Drying: Understanding the Difference

Many people confuse curing and drying, but they are completely different processes. Curing is the chemical process where cement reacts with water to form strong crystals. Drying is the physical process where excess water evaporates from the material.

Curing happens when moisture is retained in the screed so the cement can hydrate fully. Proper curing means keeping the screed moist for several days. Without curing, the cement hydrates only partially, resulting in weak, dusty screed that cracks easily.

Drying happens after curing is complete. The screed must lose its excess moisture before it can be painted. Painting a wet wall traps moisture, which causes paint to blister and peel.

## The Curing Process

Cement hydration begins the moment water is added to the mix. The reaction continues for days and weeks, with most strength development occurring in the first 7 days. The critical curing period is the first 3 days, during which the screed gains about 60 percent of its ultimate strength.

Days 4 through 7 add another 20 percent. After 7 days, the screed has achieved about 80 percent of its strength, and the remaining 20 percent develops over the following weeks.

## How to Cure Screeded Walls

**Water Spraying:** The simplest method. Spray clean water on the wall at least twice a day for 5 to 7 days. Use a fine spray to avoid damaging the fresh surface. In hot weather, spray three or four times daily.

**Wet Sacks:** Cover the wall with wet burlap sacks. The sacks retain moisture and protect the surface from sun and wind. Keep the sacks wet throughout the curing period. This is the most effective curing method.

**Plastic Sheeting:** Cover the wall with plastic sheeting to trap moisture. This method requires less water but can cause uneven curing if the plastic is not in full contact with the surface.

## Factors That Affect Curing Time

**Temperature:** Hot weather accelerates curing but also increases evaporation. In Nigerian temperatures of 30 to 40 degrees, the screed may need water spraying every few hours.

**Wind:** Wind accelerates evaporation, drying the surface before the cement has fully hydrated. Use plastic sheeting or wet sacks to protect the surface.

**Humidity:** High humidity reduces evaporation and makes curing easier. During the rainy season, natural humidity helps maintain moisture.

**Screed Thickness:** Thicker screed retains moisture longer and is easier to cure. Thin screed (under 6mm) dries quickly and requires more frequent watering.

## Drying Time After Curing

After the 5 to 7 day curing period, the screed must dry before painting. Drying time depends on weather conditions, screed thickness, and ventilation.

**Interior Walls:** 10 to 14 days after curing is complete. Total time from application: 15 to 21 days.

**Exterior Walls:** 7 to 10 days after curing. Total time from application: 12 to 17 days.

**Thick Screed (12 to 15mm):** Add 5 to 7 days to the drying time.

**Humid Season:** During the rainy season, drying can take 2 to 3 weeks longer.

## Testing for Dryness

**Plastic Tape Test:** Tape a 30cm by 30cm piece of clear plastic sheeting tightly to the wall. Wait 24 hours. If condensation forms under the plastic, the wall is still too wet to paint.

**Moisture Meter Test:** Use a moisture meter. A reading below 5 percent moisture content indicates the wall is dry enough for painting.

**Surface Test:** Press a dry paper towel against the wall for 30 seconds. If the towel absorbs moisture, the wall is not ready.

## What Happens If You Paint Too Early

Painting a screeded wall before it is fully dry traps moisture behind the paint film. The moisture attempts to escape as vapour, causing the paint to blister, bubble, and eventually peel off.

Trapped moisture can also cause mould growth behind the paint, which appears as dark patches. Fixing this problem requires removing all the paint, letting the wall dry completely, and repainting. Use the [screeding calculator](/screeding-calculator) to plan your project timeline.

## Conclusion

Curing and drying are two distinct but critical phases of screeding. Cure the screed by keeping it moist for 5 to 7 days. Then let it dry for 10 to 14 days before painting. Test for dryness using the plastic tape method. Rushing either phase results in weak screed or paint failure. Patience during curing and drying is the difference between a wall that looks good for years and one that fails within months.$ARTICLE$,
'screeding-guides', 'Frelux Editorial Team', 10, 'published', false,
'Curing and Drying Times for Screeded Walls',
'Learn the critical difference between curing and drying screeded walls, proper curing techniques, and when it is safe to paint.',
'curing screed, drying screed, screed curing time, screed drying time, when to paint screed, construction timeline, wall finishing',
now(), 11)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content, author = EXCLUDED.author, read_time_minutes = EXCLUDED.read_time_minutes, status = EXCLUDED.status, is_featured = EXCLUDED.is_featured, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, meta_keywords = EXCLUDED.meta_keywords, published_at = EXCLUDED.published_at, updated_at = now();

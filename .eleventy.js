const { DateTime } = require("luxon");

module.exports = function(eleventyConfig) {
  // Allow copying CSS
  eleventyConfig.addPassthroughCopy("src/style.css");

  // ✅ Add the date filter
  eleventyConfig.addFilter("date", (value, format = "dd MMM yyyy") => {
    return DateTime.fromJSDate(value).toFormat(format);
  });

  // Custom filter to get latest date across all pages
  eleventyConfig.addFilter("getLatestDate", (collection) => {
    const dates = collection
      .map(item => item.date)
      .filter(date => !!date); // remove null/undefined

    return new Date(Math.max(...dates));
  });

  // Allow pass through assets
  eleventyConfig.addPassthroughCopy("assets");

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "docs"
    }
  };
};
/**
 * Handlebars "ifnull" helper. Usage:
 *
 * {{ifnull value "fallback"}}
 */

export default function (value, fallback) {
    return (value === null) ? fallback : value;
};

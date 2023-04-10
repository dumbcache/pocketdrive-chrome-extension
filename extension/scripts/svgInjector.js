/**
 * Bundled by jsDelivr using Rollup v2.74.1 and Terser v5.15.1.
 * Original file: /npm/svg-injector@1.1.3/svg-injector.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
var t,
    e = { exports: {} };
(t = e),
    (function (e, r) {
        var n = "file:" === e.location.protocol,
            i = r.implementation.hasFeature(
                "http://www.w3.org/TR/SVG11/feature#BasicStructure",
                "1.1"
            ),
            a =
                Array.prototype.forEach ||
                function (t, e) {
                    if (null == this || "function" != typeof t)
                        throw new TypeError();
                    var r,
                        n = this.length >>> 0;
                    for (r = 0; r < n; ++r)
                        r in this && t.call(e, this[r], r, this);
                },
            o = {},
            l = 0,
            s = [],
            u = [],
            c = {},
            f = function (t) {
                return t.cloneNode(!0);
            },
            p = function (t, e) {
                (u[t] = u[t] || []), u[t].push(e);
            },
            d = function (t, r) {
                if (void 0 !== o[t])
                    o[t] instanceof SVGSVGElement ? r(f(o[t])) : p(t, r);
                else {
                    if (!e.XMLHttpRequest)
                        return r("Browser does not support XMLHttpRequest"), !1;
                    (o[t] = {}), p(t, r);
                    var i = new XMLHttpRequest();
                    (i.onreadystatechange = function () {
                        if (4 === i.readyState) {
                            if (404 === i.status || null === i.responseXML)
                                return (
                                    r("Unable to load SVG file: " + t),
                                    n &&
                                        r(
                                            "Note: SVG injection ajax calls do not work locally without adjusting security setting in your browser. Or consider using a local webserver."
                                        ),
                                    r(),
                                    !1
                                );
                            if (!(200 === i.status || (n && 0 === i.status)))
                                return (
                                    r(
                                        "There was a problem injecting the SVG: " +
                                            i.status +
                                            " " +
                                            i.statusText
                                    ),
                                    !1
                                );
                            if (i.responseXML instanceof Document)
                                o[t] = i.responseXML.documentElement;
                            else if (
                                DOMParser &&
                                DOMParser instanceof Function
                            ) {
                                var e;
                                try {
                                    e = new DOMParser().parseFromString(
                                        i.responseText,
                                        "text/xml"
                                    );
                                } catch (t) {
                                    e = void 0;
                                }
                                if (
                                    !e ||
                                    e.getElementsByTagName("parsererror").length
                                )
                                    return (
                                        r("Unable to parse SVG file: " + t), !1
                                    );
                                o[t] = e.documentElement;
                            }
                            !(function (t) {
                                for (var e = 0, r = u[t].length; e < r; e++)
                                    !(function (e) {
                                        setTimeout(function () {
                                            u[t][e](f(o[t]));
                                        }, 0);
                                    })(e);
                            })(t);
                        }
                    }),
                        i.open("GET", t),
                        i.overrideMimeType && i.overrideMimeType("text/xml"),
                        i.send();
                }
            },
            v = function (t, r, n, o) {
                var u = t.getAttribute("data-src") || t.getAttribute("src");
                if (/\.svg/i.test(u))
                    if (i)
                        -1 === s.indexOf(t) &&
                            (s.push(t),
                            t.setAttribute("src", ""),
                            d(u, function (n) {
                                if (void 0 === n || "string" == typeof n)
                                    return o(n), !1;
                                var i = t.getAttribute("id");
                                i && n.setAttribute("id", i);
                                var f = t.getAttribute("title");
                                f && n.setAttribute("title", f);
                                var p = []
                                    .concat(
                                        n.getAttribute("class") || [],
                                        "injected-svg",
                                        t.getAttribute("class") || []
                                    )
                                    .join(" ");
                                n.setAttribute(
                                    "class",
                                    (function (t) {
                                        for (
                                            var e = {},
                                                r = (t = t.split(" ")).length,
                                                n = [];
                                            r--;

                                        )
                                            e.hasOwnProperty(t[r]) ||
                                                ((e[t[r]] = 1),
                                                n.unshift(t[r]));
                                        return n.join(" ");
                                    })(p)
                                );
                                var d = t.getAttribute("style");
                                d && n.setAttribute("style", d);
                                var v = [].filter.call(
                                    t.attributes,
                                    function (t) {
                                        return /^data-\w[\w\-]*$/.test(t.name);
                                    }
                                );
                                a.call(v, function (t) {
                                    t.name &&
                                        t.value &&
                                        n.setAttribute(t.name, t.value);
                                });
                                var g,
                                    h,
                                    m,
                                    b,
                                    y,
                                    A = {
                                        clipPath: ["clip-path"],
                                        "color-profile": ["color-profile"],
                                        cursor: ["cursor"],
                                        filter: ["filter"],
                                        linearGradient: ["fill", "stroke"],
                                        marker: [
                                            "marker",
                                            "marker-start",
                                            "marker-mid",
                                            "marker-end",
                                        ],
                                        mask: ["mask"],
                                        pattern: ["fill", "stroke"],
                                        radialGradient: ["fill", "stroke"],
                                    };
                                Object.keys(A).forEach(function (t) {
                                    (g = t), (m = A[t]);
                                    for (
                                        var e = 0,
                                            r = (h = n.querySelectorAll(
                                                "defs " + g + "[id]"
                                            )).length;
                                        e < r;
                                        e++
                                    ) {
                                        var i;
                                        (b = h[e].id),
                                            (y = b + "-" + l),
                                            a.call(m, function (t) {
                                                for (
                                                    var e = 0,
                                                        r = (i =
                                                            n.querySelectorAll(
                                                                "[" +
                                                                    t +
                                                                    '*="' +
                                                                    b +
                                                                    '"]'
                                                            )).length;
                                                    e < r;
                                                    e++
                                                )
                                                    i[e].setAttribute(
                                                        t,
                                                        "url(#" + y + ")"
                                                    );
                                            }),
                                            (h[e].id = y);
                                    }
                                }),
                                    n.removeAttribute("xmlns:a");
                                for (
                                    var w,
                                        x,
                                        S = n.querySelectorAll("script"),
                                        k = [],
                                        G = 0,
                                        T = S.length;
                                    G < T;
                                    G++
                                )
                                    ((x = S[G].getAttribute("type")) &&
                                        "application/ecmascript" !== x &&
                                        "application/javascript" !== x) ||
                                        ((w =
                                            S[G].innerText || S[G].textContent),
                                        k.push(w),
                                        n.removeChild(S[G]));
                                if (
                                    k.length > 0 &&
                                    ("always" === r || ("once" === r && !c[u]))
                                ) {
                                    for (var M = 0, j = k.length; M < j; M++)
                                        new Function(k[M])(e);
                                    c[u] = !0;
                                }
                                var E = n.querySelectorAll("style");
                                a.call(E, function (t) {
                                    t.textContent += "";
                                }),
                                    t.parentNode.replaceChild(n, t),
                                    delete s[s.indexOf(t)],
                                    (t = null),
                                    l++,
                                    o(n);
                            }));
                    else {
                        var f =
                            t.getAttribute("data-fallback") ||
                            t.getAttribute("data-png");
                        f
                            ? (t.setAttribute("src", f), o(null))
                            : n
                            ? (t.setAttribute(
                                  "src",
                                  n +
                                      "/" +
                                      u.split("/").pop().replace(".svg", ".png")
                              ),
                              o(null))
                            : o(
                                  "This browser does not support SVG and no PNG fallback was defined."
                              );
                    }
                else
                    o(
                        "Attempted to inject a file with a non-svg extension: " +
                            u
                    );
            };
        t.exports = function (t, e, r) {
            var n = (e = e || {}).evalScripts || "always",
                i = e.pngFallback || !1,
                o = e.each;
            if (void 0 !== t.length) {
                var l = 0;
                a.call(t, function (e) {
                    v(e, n, i, function (e) {
                        o && "function" == typeof o && o(e),
                            r && t.length === ++l && r(l);
                    });
                });
            } else
                t
                    ? v(t, n, i, function (e) {
                          o && "function" == typeof o && o(e),
                              r && r(1),
                              (t = null);
                      })
                    : r && r(0);
        };
    })(window, document);
var r = e.exports;
export { r as default };
//# sourceMappingURL=/sm/623ac2457687f099249e9265db15ab6718495e710f611f10cfcefdc82d4d9c8a.map

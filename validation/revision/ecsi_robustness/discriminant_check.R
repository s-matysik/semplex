# Cross-check for discriminant.py: HTMT (semTools), MLM fit of the four measurement models and
# Satorra-Bentler (2001) scaled difference tests of each merged model against the six-factor model (lavaan::anova).
# A merged model fixes a latent correlation at 1, on the boundary of the parameter space, so the test is conservative.
suppressMessages({library(lavaan); library(semTools); library(jsonlite)})
args <- commandArgs(trailingOnly = FALSE)
here <- dirname(normalizePath(sub("--file=", "", args[grep("--file=", args)])))
res <- fromJSON(file.path(here, "discriminant_results.json"), simplifyVector = FALSE)
d <- read.csv(file.path(here, "..", "..", "data", "ecsi.csv"))
six <- res$syntax$i_six_factors$cfa
meas_only <- paste(grep("=~", strsplit(six, "\n")[[1]], value = TRUE), collapse = "\n")
h <- htmt(meas_only, data = d, htmt2 = FALSE)
fits <- lapply(res$syntax, function(s) cfa(s$cfa, data = d, estimator = "MLM"))
fm <- lapply(fits, function(f) as.list(fitMeasures(f, c("chisq", "df", "chisq.scaled", "cfi.scaled", "tli.scaled", "rmsea.scaled", "srmr", "aic", "bic"))))
tests <- lapply(names(fits)[-1], function(n) { a <- anova(fits[[n]], fits[["i_six_factors"]], method = "satorra.bentler.2001")
  list(model = n, dchi2 = a[["Chisq diff"]][2], ddf = a[["Df diff"]][2], p = a[["Pr(>Chisq)"]][2]) })
write_json(list(htmt = h, names = colnames(h), fit = fm, tests = tests, lavaan = as.character(packageVersion("lavaan")), semTools = as.character(packageVersion("semTools"))),
           file.path(here, "discriminant_check.json"), digits = NA, auto_unbox = TRUE)
cat("done\n")

# Reference values under the definitions SEMplex implements (complements lavaan_reference.R).
# omega: one-factor CFA per scale, model-implied variance; AVE: Fornell-Larcker mean of squared
# standardized loadings; HTMT: original arithmetic-mean version (Henseler et al., 2015);
# parallel analysis: Horn's version on unreduced (principal-component) eigenvalues.
# Run from the repository root after lavaan_reference.R:  Rscript validation/lavaan_definitions.R
suppressMessages({ library(lavaan); library(semTools); library(psych); library(jsonlite) })
dat <- read.csv("validation/data/ecsi.csv")
scales <- list(IMAG = paste0("imag", 1:5), EXPE = paste0("expe", 1:5), QUAL = paste0("qual", 1:5),
               VAL = paste0("val", 1:4), SAT = paste0("sat", 1:4), LOY = paste0("loy", 1:4))
meas <- paste(sprintf("%s =~ %s", names(scales), sapply(scales, paste, collapse = " + ")), collapse = "\n")
out <- list()
out$omega_onefactor <- lapply(names(scales), function(f) {
  m <- cfa(sprintf("F =~ %s", paste(scales[[f]], collapse = " + ")), dat, std.lv = TRUE)
  as.numeric(compRelSEM(m, obs.var = FALSE))
})
names(out$omega_onefactor) <- names(scales)
fc <- cfa(meas, dat)
ss <- standardizedSolution(fc)
out$ave_fornell_larcker <- lapply(names(scales), function(f) mean(ss$est.std[ss$op == "=~" & ss$lhs == f]^2))
names(out$ave_fornell_larcker) <- names(scales)
out$htmt_original <- htmt(meas, dat, htmt2 = FALSE)
set.seed(1)
pa <- fa.parallel(dat, fa = "pc", n.iter = 100, plot = FALSE, quant = 0.95)
out$parallel_ncomp_pc95 <- pa$ncomp
# Satorra-Bentler (2001) scaled chi-square difference: six-factor CFA vs. the same model with residual
# covariances between paired expectation and quality items (expe_k ~~ qual_k)
pairs <- paste(sprintf("expe%d ~~ qual%d", 1:5, 1:5), collapse = "\n")
m1 <- cfa(meas, dat, estimator = "MLM")
m2 <- cfa(paste(meas, pairs, sep = "\n"), dat, estimator = "MLM")
a <- anova(m2, m1)
out$sb2001 <- list(dchi2 = a[["Chisq diff"]][2], ddf = a[["Df diff"]][2], p = a[["Pr(>Chisq)"]][2],
                   cfi_scaled_m1 = unname(fitMeasures(m1, "cfi.scaled")), cfi_scaled_m2 = unname(fitMeasures(m2, "cfi.scaled")))
write_json(out, "validation/results/lavaan_definitions.json", digits = 10, auto_unbox = TRUE, pretty = TRUE)
cat("written validation/results/lavaan_definitions.json\n")

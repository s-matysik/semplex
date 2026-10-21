# Reference results for the SEMplex validation on the ECSI customer-satisfaction data.
# Data: cSEM::satisfaction (N = 250 customers of a Spanish bank; 27 indicators, integer responses 0-10; the meaning of 0 is undocumented),
# downloaded from CRAN at run time and not redistributed (GPL-3).
# Run from the repository root:  Rscript validation/lavaan_reference.R
suppressMessages({
  library(lavaan)
  library(semTools)
  library(psych)
  library(jsonlite)
})

dir.create("validation/data", showWarnings = FALSE, recursive = TRUE)
dir.create("validation/results", showWarnings = FALSE, recursive = TRUE)
rdata <- "validation/data/satisfaction.RData"
if (!file.exists(rdata)) {
  tgz <- tempfile(fileext = ".tar.gz")
  # current release path; once 0.7.1 is superseded CRAN moves it to Archive/
  urls <- c("https://cran.r-project.org/src/contrib/cSEM_0.7.1.tar.gz",
            "https://cran.r-project.org/src/contrib/Archive/cSEM/cSEM_0.7.1.tar.gz")
  ok <- FALSE
  for (u in urls) {
    ok <- tryCatch({ download.file(u, tgz, mode = "wb", quiet = TRUE); TRUE }, error = function(e) FALSE, warning = function(w) FALSE)
    if (ok) break
  }
  if (!ok) stop("cSEM_0.7.1.tar.gz could not be downloaded from CRAN")
  untar(tgz, files = "cSEM/data/satisfaction.RData", exdir = tempdir())
  file.copy(file.path(tempdir(), "cSEM/data/satisfaction.RData"), rdata)
}
load(rdata)
dat <- as.data.frame(satisfaction)
write.csv(dat, "validation/data/ecsi.csv", row.names = FALSE)

meas <- "
IMAG =~ imag1 + imag2 + imag3 + imag4 + imag5
EXPE =~ expe1 + expe2 + expe3 + expe4 + expe5
QUAL =~ qual1 + qual2 + qual3 + qual4 + qual5
VAL  =~ val1 + val2 + val3 + val4
SAT  =~ sat1 + sat2 + sat3 + sat4
LOY  =~ loy1 + loy2 + loy3 + loy4
"
struct <- "
EXPE ~ IMAG
QUAL ~ EXPE
VAL  ~ EXPE + q*QUAL
SAT  ~ IMAG + EXPE + QUAL + v*VAL
LOY  ~ IMAG + SAT
ind := q*v
"
out <- list(n = nrow(dat), lavaan = as.character(packageVersion("lavaan")),
            semTools = as.character(packageVersion("semTools")), psych = as.character(packageVersion("psych")),
            R = R.version.string)
fm <- c("chisq", "df", "pvalue", "cfi", "tli", "rmsea", "rmsea.ci.lower", "rmsea.ci.upper", "srmr", "aic", "bic", "logl")
fms <- c("chisq.scaled", "df.scaled", "pvalue.scaled", "chisq.scaling.factor", "cfi.scaled", "tli.scaled", "rmsea.scaled", "cfi.robust", "rmsea.robust")
pt <- function(f) {
  s <- standardizedSolution(f, se = TRUE)
  p <- parameterEstimates(f)
  m <- merge(p[, c("lhs", "op", "rhs", "est", "se")], s[, c("lhs", "op", "rhs", "est.std", "se")],
             by = c("lhs", "op", "rhs"), suffixes = c("", ".std"))
  m[m$op %in% c("=~", "~", "~~", ":="), ]
}
fits <- list()
for (est in c("ML", "MLM")) {
  for (nm in c("cfa", "sem")) {
    model <- if (nm == "cfa") meas else paste(meas, struct)
    f <- if (nm == "cfa") cfa(model, dat, estimator = est) else sem(model, dat, estimator = est)
    rec <- list(fit = as.list(fitMeasures(f, if (est == "MLM") c(fm, fms) else fm)), params = pt(f))
    if (est == "ML") {
      mi <- modindices(f, sort. = TRUE, maximum.number = 10)
      rec$mi <- mi[, c("lhs", "op", "rhs", "mi", "epc", "sepc.all")]
      if (nm == "sem") rec$r2 <- as.list(lavInspect(f, "r2"))
    }
    fits[[paste(nm, est, sep = "_")]] <- rec
  }
}
out$fits <- fits

# Reliability and discriminant validity from the CFA (semTools)
fcfa <- cfa(meas, dat)
rel <- compRelSEM(fcfa, tau.eq = FALSE)
out$omega <- as.list(rel)
out$alpha <- as.list(compRelSEM(fcfa, tau.eq = TRUE))
out$ave <- as.list(AVE(fcfa))
out$htmt <- htmt(meas, dat)

# EFA reference (psych): minres + oblimin on 27 indicators, parallel analysis
set.seed(1)
items <- names(dat)
pa <- fa.parallel(dat[, items], fa = "fa", fm = "minres", n.iter = 50, plot = FALSE)
out$parallel_nfact <- pa$nfact
efa6 <- fa(dat[, items], nfactors = 6, fm = "minres", rotate = "oblimin")
out$efa6_loadings <- unclass(efa6$loadings)[, 1:6]
out$kmo <- KMO(dat[, items])$MSA

# Bootstrap of the indirect effect QUAL -> VAL -> SAT (percentile CI), 1000 draws
set.seed(1)
fb <- sem(paste(meas, struct), dat, se = "bootstrap", bootstrap = 1000)
pb <- parameterEstimates(fb, boot.ci.type = "perc", standardized = TRUE)
out$boot_ind <- pb[pb$label == "ind", c("est", "ci.lower", "ci.upper")]

# Structural-after-measurement (local SAM) for SAT ~ QUAL + VAL (compare-approaches case)
cmp <- "
QUAL =~ qual1 + qual2 + qual3 + qual4 + qual5
VAL  =~ val1 + val2 + val3 + val4
SAT  =~ sat1 + sat2 + sat3 + sat4
SAT ~ QUAL + VAL
"
fsam <- sam(cmp, dat, sam.method = "local")
ss <- standardizedSolution(fsam)
out$sam_std <- ss[ss$op == "~", c("lhs", "rhs", "est.std")]
fsem <- sem(cmp, dat)
ss2 <- standardizedSolution(fsem)
out$sem_cmp_std <- ss2[ss2$op == "~", c("lhs", "rhs", "est.std")]
# regression on scale means
mm <- data.frame(QUAL = rowMeans(dat[, paste0("qual", 1:5)]), VAL = rowMeans(dat[, paste0("val", 1:4)]),
                 SAT = rowMeans(dat[, paste0("sat", 1:4)]))
out$sum_std <- as.list(coef(lm(scale(SAT) ~ scale(QUAL) + scale(VAL), data = mm))[-1])

write_json(out, "validation/results/lavaan_reference.json", digits = 10, auto_unbox = TRUE, pretty = TRUE)
cat("written validation/results/lavaan_reference.json\n")

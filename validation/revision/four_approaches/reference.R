# Review item 1, step 2: independent R reference for four SEMplex comparison approaches (does not use SEMplex).
# Factor scores: lavaan::lavPredict(method = "regression"); Croon (2002) correction from lavaan Lambda/Theta/Psi;
# single indicator: lavaan model with each construct measured by its item mean, loading 1, error variance (1 - alpha) * var_N(mean);
# ESEM approximation: stats::factanal ML on the item correlation matrix + GPArotation oblique target rotation
# (identity start, as SEMplex, and 30 random starts keeping the lowest criterion).
# Usage (repository root): Rscript validation/revision/four_approaches/reference.R
suppressMessages({library(lavaan); library(GPArotation); library(jsonlite)})
args <- commandArgs(trailingOnly = FALSE)
here <- dirname(normalizePath(sub("--file=", "", args[grep("--file=", args)])))
root <- normalizePath(file.path(here, "..", "..", ".."))
cfg <- fromJSON(file.path(here, "models.json"), simplifyVector = FALSE)
sc <- lapply(cfg$scales, unlist)
dat <- read.csv(file.path(root, "validation", "data", "ecsi.csv"))
beta_cor <- function(R, ypos, xpos) as.numeric(solve(R[xpos, xpos, drop = FALSE], R[xpos, ypos]))
alpha_f <- function(X) { k <- ncol(X); C <- cov(X); k / (k - 1) * (1 - sum(diag(C)) / sum(C)) }
est4 <- function(D, y, xs) {
  fac <- c(xs, y); items <- unlist(sc[fac]); ypos <- length(fac); xpos <- seq_along(xs)
  out <- list()
  syn <- paste(sprintf("%s =~ %s", fac, sapply(fac, function(f) paste(sc[[f]], collapse = " + "))), collapse = "\n")
  r <- tryCatch({
    fit <- cfa(syn, data = D[, items], estimator = "ML", se = "none", test = "none")
    ok <- lavInspect(fit, "converged") && suppressWarnings(lavInspect(fit, "post.check"))
    FS <- lavPredict(fit, method = "regression")
    e <- lavInspect(fit, "est"); L <- e$lambda[items, fac]; Th <- e$theta[items, items]; Ps <- e$psi[fac, fac]
    Sig <- L %*% Ps %*% t(L) + Th; A <- Ps %*% t(L) %*% solve(Sig)
    S <- lavInspect(fit, "sampstat")$cov[items, items]
    AL <- A %*% L; Ce <- solve(AL) %*% (A %*% S %*% t(A) - A %*% Th %*% t(A)) %*% t(solve(AL))
    list(fscore = beta_cor(cor(FS[, fac]), ypos, xpos), croon = beta_cor(cov2cor(Ce), ypos, xpos),
         fs_ok = ok, croon_ok = ok && all(diag(Ce) > 0), Rfs = cor(FS[, fac]), Rcr = cov2cor(Ce))
  }, error = function(err) list(fscore = rep(NA, length(xs)), croon = rep(NA, length(xs)), fs_ok = FALSE, croon_ok = FALSE))
  out$fscore <- r$fscore; out$croon <- r$croon; out$fscore_ok <- r$fs_ok; out$croon_ok <- r$croon_ok; out$Rfs <- r$Rfs; out$Rcr <- r$Rcr
  # single indicator
  r2 <- tryCatch({
    M <- sapply(fac, function(f) rowMeans(D[, sc[[f]]])); colnames(M) <- paste0("s_", fac)
    lines <- c()
    for (f in fac) {
      v <- mean((M[, paste0("s_", f)] - mean(M[, paste0("s_", f)]))^2)
      ev <- max((1 - alpha_f(as.matrix(D[, sc[[f]]]))) * v, 1e-6)
      lines <- c(lines, sprintf("%s =~ 1*s_%s", f, f), sprintf("s_%s ~~ %.10f*s_%s", f, ev, f))
    }
    lines <- c(lines, sprintf("%s ~ %s", y, paste(xs, collapse = " + ")))
    f2 <- sem(paste(lines, collapse = "\n"), data = as.data.frame(M), se = "none", test = "none")
    ss <- standardizedSolution(f2, se = FALSE)
    b <- sapply(xs, function(x) ss$est.std[ss$op == "~" & ss$lhs == y & ss$rhs == x])
    list(b = as.numeric(b), ok = lavInspect(f2, "converged") && suppressWarnings(lavInspect(f2, "post.check")))
  }, error = function(err) list(b = rep(NA, length(xs)), ok = FALSE))
  out$single <- r2$b; out$single_ok <- r2$ok
  # ESEM approximation
  r3 <- tryCatch({
    Rm <- cor(D[, items]); k <- length(fac)
    fa0 <- factanal(covmat = Rm, factors = k, rotation = "none", n.obs = nrow(D)); L0 <- unclass(fa0$loadings)
    esem_ok <- all(fa0$uniquenesses > 0.0051)  # boundary (Heywood) solution: factanal bounds uniquenesses at 0.005
    Tg <- matrix(0, length(items), k); pos <- 0
    for (j in seq_along(fac)) { nj <- length(sc[[fac[j]]]); Tg[(pos + 1):(pos + nj), j] <- NA; pos <- pos + nj }
    fit_rot <- function(Tm) GPFoblq(L0, Tmat = Tm, method = "target", methodArgs = list(Target = Tg), eps = 1e-6, maxit = 1000)
    crit <- function(g) sum((ifelse(is.na(Tg), 0, 1) * g$loadings)^2)
    g_id <- fit_rot(diag(k)); best <- g_id
    set.seed(20261027)
    for (s in 1:30) { g <- tryCatch(fit_rot(Random.Start(k)), error = function(e) NULL); if (!is.null(g) && crit(g) < crit(best) - 1e-9) best <- g }
    fin <- function(g) { sg <- sign(colSums(g$loadings * is.na(Tg))); sg[sg == 0] <- 1; P <- g$Phi * outer(sg, sg); list(b = beta_cor(P, k, seq_along(xs)), P = P) }
    a <- fin(g_id); b <- fin(best)
    list(b_id = a$b, b_best = b$b, P = a$P, crit_id = crit(g_id), crit_best = crit(best), ok = esem_ok)
  }, error = function(err) list(b_id = rep(NA, length(xs)), b_best = rep(NA, length(xs)), crit_id = NA, crit_best = NA))
  out$esem_ok <- isTRUE(r3$ok); out$esem <- r3$b_id; out$esem_rs <- r3$b_best; out$esem_crit_id <- r3$crit_id; out$esem_crit_best <- r3$crit_best; out$Pesem <- r3$P
  out
}
for (nm in names(cfg$models)) {
  y <- cfg$models[[nm]]$y; xs <- unlist(cfg$models[[nm]]$xs); fac <- c(xs, y)
  D <- na.omit(dat[, unlist(sc[fac])]); rownames(D) <- NULL
  p <- est4(D, y, xs)
  write_json(list(beta = list(fscore = p$fscore, croon = p$croon, single = p$single, esem = p$esem, esem_rs = p$esem_rs),
                  valid = list(fscore = p$fscore_ok, croon = p$croon_ok, single = p$single_ok, esem = p$esem_ok),
                  latent_corr = list(fscore = p$Rfs, croon = p$Rcr, esem = p$Pesem), esem_crit = c(p$esem_crit_id, p$esem_crit_best)),
             file.path(here, sprintf("reference_point_%s.json", nm)), digits = NA, auto_unbox = TRUE)
  idx <- as.matrix(read.csv(file.path(here, sprintf("indices_%s.csv", nm)), header = FALSE)) + 1
  rows <- vector("list", nrow(idx))
  for (r in seq_len(nrow(idx))) {
    e <- est4(D[idx[r, ], , drop = FALSE], y, xs)
    row <- list(draw = r, fscore_valid = e$fscore_ok, croon_valid = e$croon_ok, single_valid = e$single_ok,
                esem_valid = e$esem_ok, esem_crit_id = e$esem_crit_id, esem_crit_best = e$esem_crit_best)
    for (j in seq_along(xs)) { x <- xs[j]
      row[[paste0("fscore_", x)]] <- e$fscore[j]; row[[paste0("croon_", x)]] <- e$croon[j]; row[[paste0("single_", x)]] <- e$single[j]
      row[[paste0("esem_", x)]] <- e$esem[j]; row[[paste0("esemrs_", x)]] <- e$esem_rs[j] }
    rows[[r]] <- row
  }
  write.csv(do.call(rbind, lapply(rows, as.data.frame)), file.path(here, sprintf("reference_%s.csv", nm)), row.names = FALSE)
  cat(nm, nrow(idx), "done\n")
}
cat(as.character(packageVersion("lavaan")), as.character(packageVersion("GPArotation")), R.version.string, "\n")

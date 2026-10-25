#!/usr/bin/env python3
"""Make the site self-contained: download every photo it uses and point the pages at the local copies.

Run this once, from anywhere, with Python 3 (no extra packages needed):

    python3 tools/get-images.py

It reads tools/images.txt (the list of photos the site uses), saves each photo into
assets/img/ (keeping the original folder names), and then rewrites the pages and
assets/site.js so they load the local copies instead of vettiyilpackaging.com.
Social-share (og:image) tags are left pointing at the live site on purpose, because
link previews need an absolute address.

Options:
    --from URL    where to download from (default: the live site's uploads folder)
    --site DIR    the site folder (default: the folder above this script)
"""
import argparse
import concurrent.futures
import pathlib
import sys
import time
import urllib.error
import urllib.request

ORIGINAL = "https://vettiyilpackaging.com/wp-content/uploads/"
HERE = pathlib.Path(__file__).resolve().parent


def fetch(url, dest, tries=3):
    if dest.exists() and dest.stat().st_size > 0:
        return True, "already here"
    dest.parent.mkdir(parents=True, exist_ok=True)
    last = ""
    for n in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (site image fetch)"})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            if not data:
                raise ValueError("empty file")
            dest.write_bytes(data)
            return True, "ok"
        except (urllib.error.URLError, OSError, ValueError) as e:
            last = str(e)
            time.sleep(1 + n)
    return False, last


def main():
    ap = argparse.ArgumentParser(description="Download the site's photos and use the local copies.")
    ap.add_argument("--from", dest="source", default=ORIGINAL, help="download base URL")
    ap.add_argument("--site", default=str(HERE.parent), help="site folder")
    args = ap.parse_args()

    site = pathlib.Path(args.site).resolve()
    source = args.source if args.source.endswith("/") else args.source + "/"
    listing = HERE / "images.txt"
    if not listing.exists():
        sys.exit("tools/images.txt is missing, so there is nothing to download.")
    paths = [p.strip() for p in listing.read_text(encoding="utf-8").splitlines() if p.strip()]
    img_dir = site / "assets" / "img"

    print(f"Downloading {len(paths)} photos into {img_dir} ...")
    done, failed = [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        jobs = {pool.submit(fetch, source + p, img_dir / p): p for p in paths}
        for job in concurrent.futures.as_completed(jobs):
            p = jobs[job]
            ok, note = job.result()
            (done if ok else failed).append(p)
            if not ok:
                print(f"  could not get {p}: {note}")

    # Point pages and script at the local copies (only for photos that downloaded)
    targets = sorted(site.glob("*.html")) + [site / "assets" / "site.js", site / "assets" / "style.css"]
    changed = 0
    for f in targets:
        if not f.exists():
            continue
        lines = f.read_text(encoding="utf-8").split("\n")
        out = []
        for line in lines:
            if "og:image" in line or "twitter:image" in line:
                out.append(line)
                continue
            for p in done:
                line = line.replace(ORIGINAL + p, "assets/img/" + p)
            out.append(line)
        new = "\n".join(out)
        if new != "\n".join(lines) or new != f.read_text(encoding="utf-8"):
            f.write_text(new, encoding="utf-8")
            changed += 1

    print(f"Done. {len(done)} photos saved, {len(failed)} failed, {changed} files updated.")
    if failed:
        print("Run the script again to retry the ones that failed; the pages keep using the live site for those.")
        sys.exit(1)


if __name__ == "__main__":
    main()

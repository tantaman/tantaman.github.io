---
layout: post
title: 'Understanding False Positive Rate'
categories: statistics causes reasoning bayes
customjs:
  - /assets/posts/false-positive-rate.js
css:
  - /assets/posts/false-positive-rate.css
---

Throughout the Coronavirus pandemic, the most distressing thing has been the cherry picking of statistics.

Things have gotten better. Cases, deaths, and hospitalizations are often reported per 100k, rather than being without context. We're also getting information about the percentage of people that test positive out of all the people that were tested.

**But if you test positive for an illness, what is the chance that you really have that illness?**

Speaking with friends and family, the conversation around the chances of having COVID given a positive test generally goes:

<ul class="dialogue">
<li><strong>Me:</strong> <q>What do you think the chances are of having COVID if you test positive for COVID?</q></li>
<li><strong>Friend/Family:</strong> <q>Do you know the false positive rate of the test?</q></li>
<li><strong>Me:</strong> <q>0.5%</q></li>
<li><strong>F/F:</strong> <q>Then there's a 99.5% chance that you do have COVID.</q></li>
<li><strong>Me:</strong> <q>That's actually not how false positive rate works. You have to account for prevalence of the disease.</q></li>
</ul>

To cut to the chase, you can actually have a false positive rate of 0.5% but still have 50% of positive results be incorrect! Or even 60, 70, or 80% incorrect positive results! We'll work out how this is possible below with an interactive example.

<div class="full-info-box">
  <div class="person">
    <div class="head"></div>
    <div class="body"></div>
  </div>
</div>


sources:

https://www.fda.gov/medical-devices/letters-health-care-providers/potential-false-positive-results-antigen-tests-rapid-detection-sars-cov-2-letter-clinical-laboratory

FPR explained:
https://www.icd10monitor.com/false-positives-in-pcr-tests-for-covid-19

The Science of Why

---
layout: post
title: "Protecting APIs and Applications Against Spam"
categories: spam integrity abuse
---

Running an online application that allows for any sort of user generated content (comments, posts, file uploads, etc.) is always a potential avenue for spam.

Same goes with rest/graphql/other APIs that power your single page or mobile apps. These APIs are publically available given they're used by publically distributed apps and are thus open for spam.

Unfortunately the term spam is largely associated with email and spam research is largely email based. We're way beyond the days of email and the spam problem applies to all aspects of our applications that take writes from users.

Common forms of API & application abuse we'll be considering:
1. Registration attacks (creating new accounts)
2. Content spam (comments, photos, posts, etc.)
3. Interaction spam (ratings, reactions, following, upvotes/downvotes, etc.)

# Prior Work

* https://techbeacon.com/security/how-prevent-api-abuse-your-mobile-apps - corporate drivel. No substance.
* https://www.reddit.com/r/webdev/comments/92moka/what_is_the_best_way_to_prevent_api_abuse_for/ - decent suggestion, few details, few answers
* https://elasticemail.com/blog/marketing_tips/how-to-prevent-bots-from-spamming-your-sign-up-forms - not bad. Largely signup focused.
* https://blog.radware.com/security/applicationsecurity/2019/04/how-to-prevent-real-time-api-abuse/ - corporate drivel.
   * could be ok service https://www.radwarebotmanager.com/how-it-works/
* https://www.oopspam.com/ - looks like a good spam protection service
* https://clearbit.com/risk - service as well
* https://akismet.com/ - service too (wordpress only?)


# Methods
1. Rate limiting
   1. Force all accounts to interact at the speed of a normal user
   2. Begets the problem of many accounts
2. Feature collection?
   1. IP, email, ...
3. Behavior analysis?
4. Content analysis?

# todo:
* Centra log stream? Log topic/category?

resources:
nginx rate limit: http://nginx.org/en/docs/http/ngx_http_limit_req_module.html

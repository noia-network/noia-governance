;;; Directory Local Variables
;;; For more information see (info "(emacs) Directory Variables")

;; https://emacs.stackexchange.com/questions/12940/variable-project-root-folder-in-dir-locals-el
((nil . ((eval . (progn
                   (require 'projectile)
                   (setq flycheck-solidity-solium-soliumrcfile (concat (projectile-project-root) ".soliumrc.json")))))))

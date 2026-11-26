(component
  (core module $A
    (import "a" "add"
      (func (param i32 i32) (result i32))
    )
  )

  (core instance $a
    (instantiate $A
      (with "a"
        (instance)
      )
    )
  )
)

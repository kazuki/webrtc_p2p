SUBDIRS:=common frontend server

all: $(SUBDIRS)
clean: $(SUBDIRS)
.PHONY: $(SUBDIRS)

$(SUBDIRS):
	$(MAKE) -C $@ $(MAKECMDGOALS)

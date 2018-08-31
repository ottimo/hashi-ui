package subscriber

import (
	"time"

	"github.com/jippi/hashi-ui/backend/config"
	"github.com/jippi/hashi-ui/backend/structs"
	log "github.com/sirupsen/logrus"
)

// Watcher interface
type Watcher interface {
	Do() (structs.Response, error)
	Key() string
	IsMutable() bool
	BackendType() string
}

// Streamer interface
type Streamer interface {
	Do(send chan *structs.Action, subscribeCh chan interface{}, destroyCh chan interface{}) (structs.Response, error)
	Key() string
	IsMutable() bool
	BackendType() string
}

// Keyer interface
type Keyer interface {
	Key() string
}

// Watch is a generic watcher for Nomad
func Watch(w Watcher, s Subscription, logger *log.Entry, cfg *config.Config, send chan *structs.Action, destroyCh chan interface{}) {
	watchKey := w.Key()

	// Check if we are already subscribed
	if s.Subscribed(watchKey) {
		logger.Errorf("Already watching %s", watchKey)
		return
	}

	// Create subscription
	subscribeCh := s.Subscribe(watchKey)
	defer func() {
		s.Unsubscribe(watchKey)
		logger.Infof("Stopped watching %s", watchKey)
	}()
	logger.Infof("Started watching %s", watchKey)

	firstRun := true

	// spin up the actual worker in a Go routine to not block outer loop
	go func() {
		for {
			select {
			case <-destroyCh:
				return
			case <-subscribeCh:
				return
			default:
				if !firstRun && cfg.ThrottleUpdateDuration != nil {
					logger.Debugf("[%s] Sleeping %s before running task", watchKey, *cfg.ThrottleUpdateDuration)
					time.Sleep(*cfg.ThrottleUpdateDuration)
				}
				firstRun = false

				logger.Debugf("[%s] Running task", watchKey)
				response, err := w.Do()
				if err != nil {
					logger.Errorf("connection: unable to fetch %s: %s", watchKey, err)
					send <- &structs.Action{Type: structs.ErrorNotification, Payload: err.Error()}
					return
				}

				if !s.Subscribed(watchKey) {
					logger.Errorf("No longer subscribed to %s", watchKey)
					return
				}

				actions := response.Actions()
				if len(actions) > 0 {
					logger.Debugf("[%s] Sending %d replies", watchKey, len(actions))
					replies(actions, send)
				} else {
					logger.Debugf("[%s] No actions taken", watchKey)
				}
			}
		}
	}()

	for {
		select {
		case <-subscribeCh:
			logger.Errorf("[%s] Shutting down due to closed subscribeCh", watchKey)
			return

		case <-destroyCh:
			logger.Errorf("[%s] Shutting down due to closed destroyCh", watchKey)
			return
		}
	}
}

// Unwatch is a generic watcher for Nomad
func Unwatch(w Keyer, s Subscription, logger *log.Entry) error {
	key := w.Key()

	if s.Unsubscribe(key) {
		logger.Infof("Unwatching %s", key)
	} else {
		logger.Infof("Was not subscribed to %s", key)
	}

	return nil
}

// Once is a generic one-off query for Nomad
func Once(w Watcher, s Subscription, logger *log.Entry, send chan *structs.Action, destroyCh chan interface{}) {
	watchKey := w.Key()

	// Check if we are already subscribed
	if s.Subscribed(watchKey) {
		logger.Errorf("Already running %s", watchKey)
		return
	}

	// Create subscription
	_ = s.Subscribe(watchKey)
	defer func() {
		s.Unsubscribe(watchKey)
		logger.Infof("Stopped running %s", watchKey)
	}()
	logger.Infof("Started running %s", watchKey)

	response, err := w.Do()
	if err != nil {
		logger.Errorf("connection: unable to run %s: %s", watchKey, err)
		send <- &structs.Action{
			Payload: err.Error(),
			Type:    structs.ErrorNotification,
		}
		return
	}

	if !s.Subscribed(watchKey) {
		logger.Errorf("No longer running %s", watchKey)
		return
	}

	actions := response.Actions()
	if len(actions) > 0 {
		replies(actions, send)
	}
}

func replies(actions []*structs.Action, sendCh chan *structs.Action) {
	for _, action := range actions {
		sendCh <- action
	}
}

// Stream is a generic one-off query for Nomad
func Stream(w Streamer, s Subscription, logger *log.Entry, send chan *structs.Action, destroyCh chan interface{}) {
	watchKey := w.Key()

	// Check if we are already subscribed
	if s.Subscribed(watchKey) {
		logger.Errorf("Already streaming %s", watchKey)
		return
	}

	// Create subscription
	subscribeCh := s.Subscribe(watchKey)
	defer func() {
		s.Unsubscribe(watchKey)
		logger.Infof("Stopped streaming %s", watchKey)
	}()
	logger.Infof("Started streaming %s", watchKey)

	response, err := w.Do(send, subscribeCh, destroyCh)
	if err != nil {
		logger.Errorf("connection: unable to stream %s: %s", watchKey, err)
		send <- &structs.Action{
			Payload: err.Error(),
			Type:    structs.ErrorNotification,
		}
		return
	}

	if !s.Subscribed(watchKey) {
		logger.Errorf("No longer subscribed to %s", watchKey)
		return
	}

	actions := response.Actions()
	if len(actions) > 0 {
		replies(actions, send)
		return
	}
}

import { StyleSheet } from "react-native";


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F243D',
  },
  center: {
    flex: 1,
    backgroundColor: '#1F243D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#1F243D',
    zIndex: 10,
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    color: '#A8B5DB',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  topSection: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  coverImage: {
    width: 130,
    height: 190,
    borderRadius: 8,
    backgroundColor: '#2A2F45',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  titleRow:{
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom:12,
    alignItems: 'flex-start',
  },
  infoSection: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'flex-start', // Allinea in alto
  },
  saveIcon: {
    width: 24,
    height: 24,
    tintColor: '#A8B5DB',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  metaText: {
    color: '#A8B5DB',
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
  label: {
    fontWeight: 'bold',
    color: '#fff',
  },
  descSection: {
    marginBottom: 25,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 12,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
  },
  chaptersHeader: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 10,
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  chapterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  chapterNumber: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  chapterTitle: {
    color: '#6e7a9e',
    fontSize: 12,
    marginTop: 2,
  },
  chapterDate: {
    color: '#555',
    fontSize: 12,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  loadMoreButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  loadMoreText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  selectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  statusBanner: {
    backgroundColor: '#2A2F45', 
    padding: 8, 
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  chaptersHeaderSelected: {
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#1F243D', // Copre lo sfondo
  },
  downloadIcon: {
    width: 24,
    height: 24,
  },

  // Continue Button
  continueButton: {
    backgroundColor: '#A8B5DB',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#A8B5DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#1F243D',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButtonTextDisabled: {
    color: '#6e7a9e',
  },

  // Checkbox Styles
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A5578',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#A8B5DB',
    borderColor: '#A8B5DB',
  },
  checkmark: {
    color: '#1F243D',
    fontWeight: 'bold',
    fontSize: 14,
  },
  floatingContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0, 
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  downloadFab: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  downloadFabText: {
    color: '#1F243D',
    fontWeight: 'bold',
    fontSize: 16,
  },
  read:{
    backgroundColor: 'rgba(168, 181, 219, 0.03)',
    borderLeftWidth: 3,
    borderLeftColor: '#A8B5DB',
    paddingLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadModal: {
    width: '85%',
    backgroundColor: '#1e2336',
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 181, 219, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  downloadModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  downloadModalStatus: {
    color: '#A8B5DB',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  downloadModalWarning: {
    color: '#FF6B6B',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default styles;